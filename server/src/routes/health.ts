import type { FastifyInstance } from "fastify";
import { getEnv } from "../config/env.js";
import { getStore } from "../db/store.js";
import { PostgresStore } from "../db/postgresStore.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => {
    const env = getEnv();
    const store = getStore();
    return {
      ok: true,
      service: "audita-sst-server",
      env: env.NODE_ENV,
      esocialAmbiente: env.ESOCIAL_AMBIENTE,
      transportMock: env.transportMock,
      databaseConfigured: Boolean(env.DATABASE_URL),
      databaseConnected: store instanceof PostgresStore,
      timestamp: new Date().toISOString(),
    };
  });
}
