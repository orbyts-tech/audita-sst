import { buildApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { getStoreAsync } from "./db/store.js";
import { logger } from "./lib/logger.js";

async function main() {
  const env = getEnv();
  await getStoreAsync();
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info(
    {
      port: env.PORT,
      ambiente: env.ESOCIAL_AMBIENTE,
      transportMock: env.transportMock,
      databaseConfigured: Boolean(env.DATABASE_URL),
    },
    "audita-sst-server listening",
  );
}

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : err }, "boot_failed");
  process.exit(1);
});
