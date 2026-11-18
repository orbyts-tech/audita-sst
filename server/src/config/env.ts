import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, "../../.env") });

const boolish = (v: string | undefined) => v === "true" || v === "1" || v === "yes";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("127.0.0.1"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  /** @deprecated login legado da API — não usar como auth normal */
  AUDITA_API_USER: z.string().min(3).optional().default("legacy-disabled"),
  AUDITA_API_PASSWORD: z.string().min(8).optional().default("legacy-disabled"),
  AUDITA_JWT_SECRET: z.string().min(32).optional().default("legacy-disabled-secret-min-32-chars!!"),
  AUDITA_JWT_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  SUPABASE_URL: z.string().url().optional().or(z.literal("")).default(""),
  ESOCIAL_AMBIENTE: z.enum(["producao_restrita", "producao"]).default("producao_restrita"),
  ESOCIAL_TRANSPORT_MOCK: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  ESOCIAL_ALLOW_REAL_CALLS: z
    .string()
    .optional()
    .transform((v) => v === "yes"),
  ESOCIAL_CERT_PFX_PATH: z.string().optional().default(""),
  ESOCIAL_CERT_PASSWORD: z.string().optional().default(""),
  ESOCIAL_EMPREGADOR_CNPJ: z
    .string()
    .optional()
    .default("")
    .transform((v) => v.replace(/\D/g, "")),
  /** Fallback legado somente em development/test — nunca autoridade em produção */
  ESOCIAL_ALLOWED_COMPANY_IDS: z.string().default(""),
  /**
   * Preferir role `audita_app` (migração 006) via pooler.
   * Ex.: postgresql://audita_app:...@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   */
  DATABASE_URL: z.string().optional().default(""),
  /** Caminho para PEM da cadeia TLS (opcional). */
  DATABASE_SSL_CA: z.string().optional().default(""),
  /**
   * Escape hatch SOMENTE em development/test.
   * Em produção o boot falha se true.
   */
  DATABASE_SSL_INSECURE: z
    .string()
    .optional()
    .transform((v) => boolish(v)),
  STORAGE_DIR: z.string().default("./data/xmls"),
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(1_048_576),
  LOG_LEVEL: z.string().default("info"),
});

export type AppEnv = z.infer<typeof envSchema> & {
  corsOrigins: string[];
  allowedCompanyIds: Set<string>;
  transportMock: boolean;
  allowRealCalls: boolean;
};

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuração inválida: ${msg}`);
  }
  const data = parsed.data;
  if (data.NODE_ENV === "production" && !data.DATABASE_URL) {
    throw new Error("DATABASE_URL é obrigatória em produção.");
  }
  if (data.NODE_ENV === "production" && !data.SUPABASE_URL) {
    throw new Error("SUPABASE_URL é obrigatória em produção.");
  }
  cached = {
    ...data,
    corsOrigins: data.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
    allowedCompanyIds: new Set(
      data.ESOCIAL_ALLOWED_COMPANY_IDS.split(",").map((s) => s.trim()).filter(Boolean),
    ),
    transportMock: Boolean(data.ESOCIAL_TRANSPORT_MOCK),
    allowRealCalls: Boolean(data.ESOCIAL_ALLOW_REAL_CALLS),
  };
  return cached;
}

export function resetEnvCache() {
  cached = null;
}
