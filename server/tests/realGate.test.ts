import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { resetEnvCache } from "../src/config/env.js";
import { resetStoreForTests } from "../src/db/store.js";

describe("gate de chamada real", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.AUDITA_API_USER = "test-user";
    process.env.AUDITA_API_PASSWORD = "test-password";
    process.env.AUDITA_JWT_SECRET = "test-jwt-secret-min-32-characters!!";
    process.env.ESOCIAL_EMPREGADOR_CNPJ = "12345678000190";
    process.env.ESOCIAL_ALLOWED_COMPANY_IDS = "1";
    process.env.ESOCIAL_TRANSPORT_MOCK = "false";
    process.env.ESOCIAL_ALLOW_REAL_CALLS = "";
    process.env.ESOCIAL_CERT_PFX_PATH = "";
    process.env.ESOCIAL_CERT_PASSWORD = "";
    resetEnvCache();
    resetStoreForTests();
  });

  it("bloqueia consulta real sem ESOCIAL_ALLOW_REAL_CALLS=yes", async () => {
    const app = await buildApp();
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/token",
      payload: { username: "test-user", password: "test-password" },
    });
    const token = (login.json() as { token: string }).token;
    const res = await app.inject({
      method: "POST",
      url: "/api/empresas/1/esocial/consultas",
      headers: { authorization: `Bearer ${token}` },
      payload: { eventType: "S-1000" },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe("REAL_CALLS_BLOCKED");
  });
});
