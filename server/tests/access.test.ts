import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/auth/supabaseJwt.js", () => ({
  verifySupabaseAccessToken: vi.fn(async (token: string) => {
    if (token === "expired") {
      const { AppError } = await import("../src/lib/errors.js");
      throw new AppError("Token inválido ou expirado.", "AUTH_INVALID", 401);
    }
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
  closeAuthPool: vi.fn(),
  setAuthPoolForTests: vi.fn(),
}));

vi.mock("../src/auth/authorization.js", async () => {
  const actual = await vi.importActual<typeof import("../src/auth/authorization.js")>(
    "../src/auth/authorization.js",
  );
  return {
    ...actual,
    resolveCompanyAccess: vi.fn(async (_pool: unknown, userId: string, companyId: string) => {
      const map: Record<string, string[]> = {
        "user-a": ["emp-a1", "emp-a2"],
        "user-b": ["emp-b1"],
        "user-oper-a": ["emp-a1"],
      };
      const allowed = map[userId] ?? [];
      if (!allowed.includes(companyId)) {
        if (companyId.startsWith("emp-")) {
          return {
            userId,
            companyId,
            organizationId: "org-x",
            orgRole: null,
            companyRole: null,
            canRead: false,
            canWrite: false,
          };
        }
        const { AppError } = await import("../src/lib/errors.js");
        throw new AppError("Empresa não encontrada.", "NOT_FOUND", 404);
      }
      const canWrite = userId !== "user-viewer-a";
      return {
        userId,
        companyId,
        organizationId: userId.startsWith("user-b") ? "org-b" : "org-a",
        orgRole: userId === "user-a" || userId === "user-b" ? "admin" : "member",
        companyRole: userId === "user-oper-a" ? "operator" : null,
        canRead: true,
        canWrite,
      };
    }),
  };
});

import { buildApp } from "../src/app.js";
import { resetEnvCache } from "../src/config/env.js";
import { resetStoreForTests } from "../src/db/store.js";

describe("isolamento e auth API (Supabase token)", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.SUPABASE_URL = "https://txdxmkjthdditmdeoddr.supabase.co";
    process.env.ESOCIAL_TRANSPORT_MOCK = "true";
    process.env.ESOCIAL_EMPREGADOR_CNPJ = "12345678000190";
    process.env.DATABASE_URL = "";
    resetEnvCache();
    resetStoreForTests();
  });

  it("recusa endpoints eSocial sem token", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/empresas/emp-a1/esocial/certificado/status",
    });
    expect(res.statusCode).toBe(401);
  });

  it("14. token expirado resulta em 401", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/empresas/emp-a1/esocial/certificado/status",
      headers: { authorization: "Bearer expired" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("bloqueia empresa de outra organização (403)", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/empresas/emp-b1/esocial/certificado/status",
      headers: { authorization: "Bearer user:user-a" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("permite empresa autorizada (leitura)", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/empresas/emp-a1/esocial/certificado/status",
      headers: { authorization: "Bearer user:user-a" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("viewer não inicia consulta (403 write)", async () => {
    const { resolveCompanyAccess } = await import("../src/auth/authorization.js");
    vi.mocked(resolveCompanyAccess).mockResolvedValueOnce({
      userId: "user-viewer-a",
      companyId: "emp-a1",
      organizationId: "org-a",
      orgRole: "viewer",
      companyRole: "viewer",
      canRead: true,
      canWrite: false,
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/empresas/emp-a1/esocial/consultas",
      headers: { authorization: "Bearer user:user-viewer-a" },
      payload: { eventType: "S-1000" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("endpoint legado /api/auth/token retorna 410", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/token",
      payload: { username: "x", password: "y" },
    });
    expect(res.statusCode).toBe(410);
  });

  it("16. produção sem DATABASE_URL falha ao obter store", async () => {
    process.env.NODE_ENV = "production";
    process.env.SUPABASE_URL = "https://txdxmkjthdditmdeoddr.supabase.co";
    process.env.DATABASE_URL = "";
    resetEnvCache();
    const { getStoreAsync, resetStoreForTests: reset } = await import("../src/db/store.js");
    reset();
    await expect(getStoreAsync()).rejects.toThrow(/DATABASE_URL/);
    process.env.NODE_ENV = "test";
    resetEnvCache();
  });
});
