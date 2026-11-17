import type { FastifyReply, FastifyRequest } from "fastify";
import { getEnv } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { verifyToken, type AuthSubject } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthSubject;
  }
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("Autenticação obrigatória.", "AUTH_REQUIRED", 401);
  }
  const token = header.slice("Bearer ".length).trim();
  req.auth = await verifyToken(token);
}

export function assertCompanyAccess(companyId: string) {
  const env = getEnv();
  if (!env.allowedCompanyIds.has(companyId)) {
    throw new AppError(
      "Sem permissão para acessar dados eSocial desta empresa.",
      "FORBIDDEN_COMPANY",
      403,
    );
  }
}
