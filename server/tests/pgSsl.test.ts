import { afterEach, describe, expect, it } from "vitest";
import { resetEnvCache } from "../src/config/env.js";
import { buildPgSsl, databaseUserLooksPrivileged, isDirectDbHost } from "../src/db/pgSsl.js";

describe("pgSsl", () => {
  afterEach(() => {
    delete process.env.DATABASE_SSL_INSECURE;
    delete process.env.DATABASE_SSL_CA;
    process.env.NODE_ENV = "test";
    resetEnvCache();
  });

  it("detecta host direto supabase", () => {
    expect(
      isDirectDbHost("postgresql://u:p@db.abcdefgh.supabase.co:5432/postgres"),
    ).toBe(true);
    expect(
      isDirectDbHost("postgresql://u:p@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"),
    ).toBe(false);
  });

  it("detecta usuário privilegiado postgres", () => {
    expect(databaseUserLooksPrivileged("postgresql://postgres:x@host/db")).toBe(true);
    expect(databaseUserLooksPrivileged("postgresql://audita_app:x@host/db")).toBe(false);
  });

  it("produção rejeita DATABASE_SSL_INSECURE", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_SSL_INSECURE = "true";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.DATABASE_URL = "postgresql://audita_app:x@host/db";
    resetEnvCache();
    expect(() =>
      buildPgSsl("postgresql://audita_app:x@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"),
    ).toThrow(/não é permitido em produção/);
  });

  it("fora de produção permite insecure explicitamente", () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_SSL_INSECURE = "true";
    resetEnvCache();
    expect(buildPgSsl("postgresql://u:p@db.x.supabase.co:5432/postgres")).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("default verifica cadeia", () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_SSL_INSECURE = "false";
    resetEnvCache();
    expect(
      buildPgSsl("postgresql://u:p@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"),
    ).toEqual({ rejectUnauthorized: true });
  });
});
