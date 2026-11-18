import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { getEnv } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { AppError, toErrorResponse } from "./lib/errors.js";
import { authRoutes } from "./routes/auth.js";
import { certificateRoutes } from "./routes/certificates.js";
import { healthRoutes } from "./routes/health.js";
import { esocialRoutes } from "./routes/esocial.js";

export async function buildApp() {
  const env = getEnv();
  const app = Fastify({
    logger: false,
    // Certificados A1 via multipart podem chegar perto de 5 MB
    bodyLimit: Math.max(env.BODY_LIMIT_BYTES, 6 * 1024 * 1024),
    trustProxy: false,
  });

  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
      fields: 4,
    },
  });

  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(certificateRoutes);
  await app.register(esocialRoutes);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      const mapped = toErrorResponse(err);
      return reply.status(mapped.statusCode).send(mapped.body);
    }
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "unhandled");
    reply.status(500).send({
      error: { code: "INTERNAL_ERROR", message: "Erro interno." },
    });
  });

  return app;
}
