import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { resetEnvCache } from "../src/config/env.js";
import { resetStoreForTests } from "../src/db/store.js";

describe("isolamento e auth API", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.AUDITA_API_USER = "test-user";
    process.env.AUDITA_API_PASSWORD = "test-password";
    process.env.AUDITA_JWT_SECRET = "test-jwt-secret-min-32-characters!!";
    process.env.ESOCIAL_TRANSPORT_MOCK = "true";
    process.env.ESOCIAL_EMPREGADOR_CNPJ = "12345678000190";
    process.env.ESOCIAL_ALLOWED_COMPANY_IDS = "1";
    resetEnvCache();
    resetStoreForTests();
  });

  it("recusa endpoints eSocial sem token", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/empresas/1/esocial/certificado/status",
    });
    expect(res.statusCode).toBe(401);
  });

  it("bloqueia empresa fora da allowlist", async () => {
    const app = await buildApp();
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/token",
      payload: { username: "test-user", password: "test-password" },
    });
    const token = (login.json() as { token: string }).token;
    const res = await app.inject({
      method: "GET",
      url: "/api/empresas/999/esocial/certificado/status",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("permite empresa autorizada e consulta mock S-1000", async () => {
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
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      status: string;
      transportMock: boolean;
      eventos: unknown[];
    };
    expect(body.transportMock).toBe(true);
    expect(["concluida_com_dados", "concluida_sem_registros", "quota_indisponivel"]).toContain(
      body.status,
    );
  });
});
