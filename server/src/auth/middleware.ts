import type { FastifyReply, FastifyRequest } from "fastify";
import { getEnv } from "../config/env.js";
import { getAuthPool } from "../db/authPool.js";
import { AppError } from "../lib/errors.js";
import {
  assertCanReadCompany,
  assertCanWriteCompany,
  resolveCompanyAccess,
  type CompanyAccessContext,
} from "./authorization.js";
import {
  verifySupabaseAccessToken,
  type SupabaseAuthSubject,
} from "./supabaseJwt.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: SupabaseAuthSubject;
    companyAccess?: CompanyAccessContext;
  }
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("Autenticação obrigatória.", "AUTH_REQUIRED", 401);
  }
  const token = header.slice("Bearer ".length).trim();
  req.auth = await verifySupabaseAccessToken(token);
}

export async function requireCompanyRead(req: FastifyRequest, _reply: FastifyReply) {
  if (!req.auth?.sub) {
    throw new AppError("Autenticação obrigatória.", "AUTH_REQUIRED", 401);
  }
  const { id } = req.params as { id: string };
  const pool = getAuthPool();
  const ctx = await resolveCompanyAccess(pool, req.auth.sub, id);
  assertCanReadCompany(ctx);
  req.companyAccess = ctx;
}

export async function requireCompanyWrite(req: FastifyRequest, _reply: FastifyReply) {
  if (!req.auth?.sub) {
    throw new AppError("Autenticação obrigatória.", "AUTH_REQUIRED", 401);
  }
  const { id } = req.params as { id: string };
  const pool = getAuthPool();
  const ctx = await resolveCompanyAccess(pool, req.auth.sub, id);
  assertCanWriteCompany(ctx);
  req.companyAccess = ctx;
}

/**
 * @deprecated Preferir requireCompanyRead/Write. Mantido só para compatibilidade de testes legados.
 */
export function assertCompanyAccess(companyId: string) {
  const env = getEnv();
  if (env.NODE_ENV === "production") {
    throw new AppError(
      "assertCompanyAccess legado não é permitido em produção.",
      "FORBIDDEN_COMPANY",
      403,
    );
  }
  if (!env.allowedCompanyIds.has(companyId)) {
    throw new AppError(
      "Sem permissão para acessar dados eSocial desta empresa.",
      "FORBIDDEN_COMPANY",
      403,
    );
  }
}
