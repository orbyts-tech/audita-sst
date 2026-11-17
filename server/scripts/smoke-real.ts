/**
 * Smoke test REAL contra o eSocial.
 * NÃO executa automaticamente em CI.
 *
 * Requer:
 *   ESOCIAL_TRANSPORT_MOCK=false
 *   ESOCIAL_CERT_PFX_PATH / ESOCIAL_CERT_PASSWORD
 *   ESOCIAL_EMPREGADOR_CNPJ
 *   CONFIRM_REAL_ESOCIAL=yes
 *
 * Preferir ESOCIAL_AMBIENTE=producao_restrita.
 */
import { getEnv, resetEnvCache } from "../src/config/env.js";
import { esocialS1000Service } from "../src/services/s1000/EsocialS1000Service.js";

async function main() {
  if (process.env.CONFIRM_REAL_ESOCIAL !== "yes") {
    console.error("Abortado: defina CONFIRM_REAL_ESOCIAL=yes para chamar o governo.");
    process.exit(2);
  }
  resetEnvCache();
  const env = getEnv();
  if (env.transportMock) {
    console.error("Abortado: ESOCIAL_TRANSPORT_MOCK deve ser false.");
    process.exit(2);
  }
  if (!env.allowRealCalls) {
    console.error("Abortado: defina ESOCIAL_ALLOW_REAL_CALLS=yes.");
    process.exit(2);
  }
  if (!env.ESOCIAL_CERT_PFX_PATH || !env.ESOCIAL_CERT_PASSWORD) {
    console.error("Abortado: configure ESOCIAL_CERT_PFX_PATH e ESOCIAL_CERT_PASSWORD.");
    process.exit(2);
  }
  console.log("Ambiente:", env.ESOCIAL_AMBIENTE);
  console.log("Iniciando consulta S-1000 real (HTTPS oficial)...");
  const result = await esocialS1000Service.consultar(
    [...env.allowedCompanyIds][0] ?? "1",
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
