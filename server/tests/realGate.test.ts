import { beforeEach, describe, expect, it, vi } from "vitest";

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
    resolveCompanyAccess: vi.fn(async () => ({
      userId: "user-a",
      companyId: "1",
      organizationId: "org-a",
      orgRole: "admin" as const,
      companyRole: null,
      canRead: true,
      canWrite: true,
    })),
  };
});

import { buildApp } from "../src/app.js";
import { resetEnvCache } from "../src/config/env.js";
import { resetStoreForTests } from "../src/db/store.js";

describe("gate de chamada real", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.SUPABASE_URL = "https://txdxmkjthdditmdeoddr.supabase.co";
    process.env.ESOCIAL_EMPREGADOR_CNPJ = "12345678000190";
    process.env.ESOCIAL_TRANSPORT_MOCK = "false";
    process.env.ESOCIAL_ALLOW_REAL_CALLS = "";
    process.env.ESOCIAL_CERT_PFX_PATH = "";
    process.env.ESOCIAL_CERT_PASSWORD = "";
    process.env.DATABASE_URL = "";
    resetEnvCache();
    resetStoreForTests();
  });

  it("bloqueia consulta real sem ESOCIAL_ALLOW_REAL_CALLS=yes", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/empresas/1/esocial/consultas",
      headers: { authorization: "Bearer user:user-a" },
      payload: { eventType: "S-1000" },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe("REAL_CALLS_BLOCKED");
  });
});
