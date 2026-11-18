import FormData from "form-data";
import forge from "node-forge";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/auth/supabaseJwt.js", () => ({
  verifySupabaseAccessToken: vi.fn(async (token: string) => {
    if (token.startsWith("user:")) {
      return { sub: token.slice(5), raw: {} };
    }
    const { AppError } = await import("../src/lib/errors.js");
    throw new AppError("Token inválido ou expirado.", "AUTH_INVALID", 401);
  }),
  resetJwksCache: vi.fn(),
}));

vi.mock("../src/db/authPool.js", () => ({
  getAuthPool: vi.fn(() => ({})),
}));

vi.mock("../src/auth/authorization.js", async () => {
  const actual = await vi.importActual<typeof import("../src/auth/authorization.js")>(
    "../src/auth/authorization.js",
  );
  return {
    ...actual,
    resolveOrgAdmin: vi.fn(async (_pool: unknown, userId: string, organizationId: string) => {
      if (userId === "user-admin" && organizationId === "a1111111-1111-1111-1111-111111111111") {
        return { userId, organizationId, orgRole: "admin" as const };
      }
      const { AppError } = await import("../src/lib/errors.js");
      throw new AppError("Sem permissão administrativa nesta organização.", "FORBIDDEN_ORG", 403);
    }),
  };
});

import { buildApp } from "../src/app.js";
import { resetEnvCache } from "../src/config/env.js";
import { resetStoreForTests } from "../src/db/store.js";

function makeSelfSignedPfx(password: string, cn = "EMPRESA TESTE:12345678000190") {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 86400000);
  cert.validity.notAfter = new Date(Date.now() + 86400000 * 365);
  const attrs = [{ name: "commonName", value: cn }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: "3des",
  });
  return Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), "binary");
}

describe("POST /api/organizacoes/:orgId/certificados/validar", () => {
  const orgId = "a1111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.SUPABASE_URL = "https://txdxmkjthdditmdeoddr.supabase.co";
    process.env.DATABASE_URL = "";
    process.env.ESOCIAL_TRANSPORT_MOCK = "true";
    resetEnvCache();
    resetStoreForTests();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("valida PFX real com senha correta", async () => {
    const app = await buildApp();
    const pfx = makeSelfSignedPfx("senha-ok");
    const form = new FormData();
    form.append("senha", "senha-ok");
    form.append("certificado", pfx, {
      filename: "empresa.pfx",
      contentType: "application/x-pkcs12",
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/organizacoes/${orgId}/certificados/validar`,
      headers: {
        authorization: "Bearer user:user-admin",
        ...form.getHeaders(),
      },
      payload: form.getBuffer(),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { valid: boolean; subjectCN: string; cnpjBase?: string };
    expect(body.valid).toBe(true);
    expect(body.subjectCN).toContain("EMPRESA");
    expect(body.cnpjBase).toBe("12345678");
  });

  it("rejeita senha incorreta", async () => {
    const app = await buildApp();
    const pfx = makeSelfSignedPfx("senha-ok");
    const form = new FormData();
    form.append("senha", "errada");
    form.append("certificado", pfx, {
      filename: "empresa.pfx",
      contentType: "application/x-pkcs12",
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/organizacoes/${orgId}/certificados/validar`,
      headers: {
        authorization: "Bearer user:user-admin",
        ...form.getHeaders(),
      },
      payload: form.getBuffer(),
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: { code: string } }).error.code).toBe("CERT_PASSWORD");
  });

  it("bloqueia usuário sem papel admin", async () => {
    const app = await buildApp();
    const pfx = makeSelfSignedPfx("senha-ok");
    const form = new FormData();
    form.append("senha", "senha-ok");
    form.append("certificado", pfx, {
      filename: "empresa.pfx",
      contentType: "application/x-pkcs12",
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/organizacoes/${orgId}/certificados/validar`,
      headers: {
        authorization: "Bearer user:user-member",
        ...form.getHeaders(),
      },
      payload: form.getBuffer(),
    });

    expect(res.statusCode).toBe(403);
  });
});
