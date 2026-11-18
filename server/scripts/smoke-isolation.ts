import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "../src/app.js";
import { resetEnvCache } from "../src/config/env.js";
import { getStoreAsync } from "../src/db/store.js";

const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");
const env = fs.readFileSync(rootEnv, "utf8");
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim() ?? "";
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/)?.[1]?.trim() ?? "";

async function token(email: string) {
  const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "IsolamentoA1!" }),
  });
  const body = (await login.json()) as { access_token?: string; error_description?: string };
  if (!body.access_token) throw new Error(body.error_description || "login failed");
  return body.access_token;
}

async function main() {
  const accessToken = await token("admin-a@audita.test");
  const tokenB = await token("admin-b@audita.test");
  resetEnvCache();
  await getStoreAsync();
  const app = await buildApp();
  const EMP_A1 = "a2222222-2222-2222-2222-222222222221";
  const EMP_B1 = "b2222222-2222-2222-2222-222222222221";
  const ok = await app.inject({
    method: "GET",
    url: `/api/empresas/${EMP_A1}/esocial/certificado/status`,
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const cross = await app.inject({
    method: "GET",
    url: `/api/empresas/${EMP_B1}/esocial/certificado/status`,
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const okB = await app.inject({
    method: "GET",
    url: `/api/empresas/${EMP_B1}/esocial/certificado/status`,
    headers: { authorization: `Bearer ${tokenB}` },
  });
  const crossB = await app.inject({
    method: "GET",
    url: `/api/empresas/${EMP_A1}/esocial/certificado/status`,
    headers: { authorization: `Bearer ${tokenB}` },
  });
  console.log("AdminA->A1", ok.statusCode);
  console.log("AdminA->B1", cross.statusCode);
  console.log("AdminB->B1", okB.statusCode);
  console.log("AdminB->A1", crossB.statusCode);
  await app.close();
  if (ok.statusCode !== 200 || cross.statusCode !== 403 || okB.statusCode !== 200 || crossB.statusCode !== 403) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
