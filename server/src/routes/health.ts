import type { FastifyInstance } from "fastify";
import { getEnv } from "../config/env.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => {
    const env = getEnv();
    return {
      ok: true,
      service: "audita-sst-server",
      env: env.NODE_ENV,
      esocialAmbiente: env.ESOCIAL_AMBIENTE,
      transportMock: env.transportMock,
      databaseConfigured: Boolean(env.DATABASE_URL),
      timestamp: new Date().toISOString(),
    };
  });
}
