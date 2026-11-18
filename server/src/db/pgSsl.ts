import fs from "node:fs";
import { getEnv } from "../config/env.js";
import { logger } from "../lib/logger.js";

export type PgSslOption = boolean | { rejectUnauthorized: boolean; ca?: string };

/**
 * TLS para Postgres/Supabase.
 *
 * Recomendado: connection string do **Connection pooler** (host `*.pooler.supabase.com`,
 * porta 6543 Transaction ou 5432 Session) — costuma validar com CAs públicas.
 *
 * Host direto `db.<ref>.supabase.co:5432` pode falhar com SELF_SIGNED_CERT_IN_CHAIN
 * em alguns ambientes; use pooler ou `DATABASE_SSL_CA` com o PEM da cadeia.
 *
 * `DATABASE_SSL_INSECURE=true` só é permitido fora de produção (escape hatch temporário).
 */
export function buildPgSsl(databaseUrl: string): PgSslOption | undefined {
  if (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")) {
    return undefined;
  }

  const env = getEnv();
  const isProduction = env.NODE_ENV === "production";

  if (isProduction && env.DATABASE_SSL_INSECURE) {
    throw new Error(
      "DATABASE_SSL_INSECURE não é permitido em produção. Use o pooler Supabase ou DATABASE_SSL_CA.",
    );
  }

  if (env.DATABASE_SSL_INSECURE) {
    logger.warn(
      "DATABASE_SSL_INSECURE=true — TLS sem verificação da cadeia (apenas desenvolvimento).",
    );
    return { rejectUnauthorized: false };
  }

  const ssl: { rejectUnauthorized: true; ca?: string } = { rejectUnauthorized: true };

  if (env.DATABASE_SSL_CA) {
    const caPath = env.DATABASE_SSL_CA;
    if (!fs.existsSync(caPath)) {
      throw new Error(`DATABASE_SSL_CA não encontrado: ${caPath}`);
    }
    ssl.ca = fs.readFileSync(caPath, "utf8");
  }

  if (isDirectDbHost(databaseUrl) && !ssl.ca) {
    logger.warn(
      {
        hint: "Prefira postgresql://...@aws-0-<region>.pooler.supabase.com:6543/postgres",
      },
      "DATABASE_URL aponta para db.*.supabase.co (direto). Preferir pooler ou DATABASE_SSL_CA.",
    );
  }

  return ssl;
}

export function isDirectDbHost(databaseUrl: string): boolean {
  try {
    const u = new URL(databaseUrl);
    return /^db\.[a-z0-9]+\.supabase\.co$/i.test(u.hostname);
  } catch {
    return databaseUrl.includes("db.") && databaseUrl.includes(".supabase.co");
  }
}

export function databaseUserLooksPrivileged(databaseUrl: string): boolean {
  try {
    const u = new URL(databaseUrl);
    const user = decodeURIComponent(u.username || "");
    return user === "postgres" || user.startsWith("postgres.");
  } catch {
    return /:\/\/postgres([.:@]|$)/.test(databaseUrl);
  }
}
