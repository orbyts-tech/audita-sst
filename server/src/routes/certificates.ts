import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import { resolveOrgAdmin } from "../auth/authorization.js";
import { getAuthPool } from "../db/authPool.js";
import { AppError, toErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { certificateService } from "../services/certificate/CertificateService.js";

const MAX_CERT_BYTES = 5 * 1024 * 1024;

/**
 * Valida PFX/P12 em memória. Não persiste arquivo nem senha.
 * Resposta contém apenas metadados públicos do certificado.
 */
export async function certificateRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/api/organizacoes/:orgId/certificados/validar", async (req, reply) => {
    let pfxBuffer: Buffer | null = null;
    let password = "";
    let filename = "certificado.pfx";

    try {
      if (!req.auth?.sub) {
        throw new AppError("Autenticação obrigatória.", "AUTH_REQUIRED", 401);
      }

      const { orgId } = req.params as { orgId: string };
      if (!/^[0-9a-f-]{36}$/i.test(orgId)) {
        throw new AppError("Organização inválida.", "ORG_INVALID", 400);
      }

      await resolveOrgAdmin(getAuthPool(), req.auth.sub, orgId);

      const parts = req.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          if (part.fieldname !== "certificado" && part.fieldname !== "file") {
            continue;
          }
          filename = part.filename || filename;
          if (!/\.(pfx|p12)$/i.test(filename)) {
            throw new AppError("Envie um arquivo .pfx ou .p12 (A1).", "CERT_EXT", 400);
          }
          const chunks: Buffer[] = [];
          let total = 0;
          for await (const chunk of part.file) {
            total += chunk.length;
            if (total > MAX_CERT_BYTES) {
              throw new AppError("Certificado maior que 5 MB.", "CERT_TOO_LARGE", 400);
            }
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          if (part.file.truncated) {
            throw new AppError("Certificado maior que 5 MB.", "CERT_TOO_LARGE", 400);
          }
          pfxBuffer = Buffer.concat(chunks);
        } else if (part.type === "field" && part.fieldname === "senha") {
          password = String(part.value ?? "");
        }
      }

      if (!pfxBuffer?.length) {
        throw new AppError("Envie o arquivo do certificado (.pfx ou .p12).", "CERT_MISSING", 400);
      }
      if (!password) {
        throw new AppError("Informe a senha do certificado.", "CERT_PASSWORD_REQUIRED", 400);
      }

      const loaded = certificateService.loadFromPfx(pfxBuffer, password);
      const nomeArquivo = filename.replace(/[^\w.\-()+ ]/g, "_").slice(0, 120);

      logger.info(
        {
          organizationId: orgId,
          userId: req.auth.sub,
          subjectCN: loaded.info.subjectCN,
          notAfter: loaded.info.notAfter,
        },
        "certificate_validated",
      );

      return {
        valid: true as const,
        nomeArquivo,
        subjectCN: loaded.info.subjectCN,
        subjectO: loaded.info.subjectO,
        cnpjBase: loaded.info.cnpjBase,
        notBefore: loaded.info.notBefore,
        notAfter: loaded.info.notAfter,
        serialNumber: loaded.info.serialNumber,
        message: "Certificado A1 válido.",
      };
    } catch (err) {
      const mapped = toErrorResponse(err);
      return reply.status(mapped.statusCode).send(mapped.body);
    } finally {
      password = "";
      if (pfxBuffer) pfxBuffer.fill(0);
      pfxBuffer = null;
    }
  });
}
