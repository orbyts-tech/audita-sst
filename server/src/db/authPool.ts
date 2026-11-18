import pg from "pg";
import { getEnv } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { buildPgSsl, databaseUserLooksPrivileged } from "./pgSsl.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getAuthPool(): pg.Pool {
  const env = getEnv();
  if (!env.DATABASE_URL) {
    throw new AppError(
      "DATABASE_URL obrigatória para autorização.",
      "DB_REQUIRED",
      503,
    );
  }
  if (!pool) {
    if (databaseUserLooksPrivileged(env.DATABASE_URL)) {
      const msg =
        "DATABASE_URL usa papel privilegiado (postgres). Prefira audita_app (docs/supabase/006_app_role.sql).";
      if (env.NODE_ENV === "production") {
        logger.error(msg);
      } else {
        logger.warn(msg);
      }
    }
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: buildPgSsl(env.DATABASE_URL),
      max: 5,
    });
  }
  return pool;
}

export async function closeAuthPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Testes. */
export function setAuthPoolForTests(next: pg.Pool | null) {
  pool = next;
}
