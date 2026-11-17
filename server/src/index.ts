import { buildApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { logger } from "./lib/logger.js";

async function main() {
  const env = getEnv();
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info(
    {
      port: env.PORT,
      ambiente: env.ESOCIAL_AMBIENTE,
      transportMock: env.transportMock,
    },
    "audita-sst-server listening",
  );
}

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : err }, "boot_failed");
  process.exit(1);
});
