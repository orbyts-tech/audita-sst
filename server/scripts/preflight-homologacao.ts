/**
 * Diagnóstico de pré-homologação — NÃO chama o eSocial e NÃO consome quota.
 *
 * Uso:
 *   cd server && npm run preflight
 *
 * Valida: env, auth config, certificado (se path informado), janela de calendário,
 * endpoints oficiais, montagem/assinatura XML local (somente com PFX real).
 */
import fs from "node:fs";
import path from "node:path";
import { getEnv, resetEnvCache } from "../src/config/env.js";
import { certificateService } from "../src/services/certificate/CertificateService.js";
import { ESOCIAL_ENDPOINTS } from "../src/services/soap/endpoints.js";
import {
  buildConsultaTabelaXml,
  employerNrInsc,
  wrapSoapEnvelope,
} from "../src/services/soap/buildMessages.js";
import { serviceNs, soapActionConsultarTabela } from "../src/services/soap/endpoints.js";
import { assertEsocialSignatureShape, signEnvelopedXml } from "../src/services/xmldsig/signXml.js";
import { DIAS_BLOQUEADOS } from "../src/services/quota/QuotaManager.js";

type Check = { name: string; ok: boolean; detail: string };

function brDay(now = new Date()) {
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getDate();
}

function push(checks: Check[], name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  const mark = ok ? "OK  " : "FAIL";
  console.log(`[${mark}] ${name}: ${detail}`);
}

async function main() {
  resetEnvCache();
  const checks: Check[] = [];
  let env;
  try {
    env = getEnv();
    push(checks, "env.parse", true, `NODE_ENV=${env.NODE_ENV}`);
  } catch (err) {
    push(checks, "env.parse", false, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  push(
    checks,
    "auth.supabase_url",
    Boolean(env.SUPABASE_URL),
    "SUPABASE_URL configurada (JWT via JWKS; secret legado não é necessário)",
  );
  push(
    checks,
    "auth.database_url",
    Boolean(env.DATABASE_URL),
    "DATABASE_URL para autorização por org/empresa",
  );

  push(
    checks,
    "esocial.ambiente",
    env.ESOCIAL_AMBIENTE === "producao_restrita" || env.ESOCIAL_AMBIENTE === "producao",
    env.ESOCIAL_AMBIENTE,
  );

  const endpoints = ESOCIAL_ENDPOINTS[env.ESOCIAL_AMBIENTE];
  const officialHost =
    env.ESOCIAL_AMBIENTE === "producao"
      ? "webservices.download.esocial.gov.br"
      : "webservices.producaorestrita.esocial.gov.br";
  push(
    checks,
    "esocial.endpoints",
    endpoints.consultaIdentificadores.includes(officialHost) &&
      endpoints.downloadEventos.includes(officialHost),
    `consulta=${endpoints.consultaIdentificadores}`,
  );

  push(
    checks,
    "esocial.transport_mock",
    true,
    env.transportMock
      ? "true — NÃO chama o governo (seguro para desenvolvimento)"
      : "false — chamadas usariam endpoint oficial (ainda exige ESOCIAL_ALLOW_REAL_CALLS=yes)",
  );

  push(
    checks,
    "esocial.allow_real_calls",
    true,
    env.allowRealCalls
      ? "yes — gate aberto (cuidado)"
      : "não definido/yes ausente — chamadas reais bloqueadas (recomendado até homologar)",
  );

  const cnpjOk = env.ESOCIAL_EMPREGADOR_CNPJ.length === 14;
  push(
    checks,
    "esocial.empregador_cnpj",
    cnpjOk,
    cnpjOk ? env.ESOCIAL_EMPREGADOR_CNPJ : "informe 14 dígitos em ESOCIAL_EMPREGADOR_CNPJ",
  );

  push(
    checks,
    "esocial.allowlist",
    env.allowedCompanyIds.size > 0,
    `companyIds=[${[...env.allowedCompanyIds].join(",")}]`,
  );

  const day = brDay();
  const calendarOk = !DIAS_BLOQUEADOS.has(day);
  push(
    checks,
    "quota.calendario_br",
    calendarOk,
    calendarOk
      ? `dia ${day} fora do bloqueio 1–7`
      : `dia ${day} bloqueado (manual: sem consulta/download dias 1–7)`,
  );

  const pfxPath = env.ESOCIAL_CERT_PFX_PATH;
  const hasPfxConfig = Boolean(pfxPath && env.ESOCIAL_CERT_PASSWORD);
  if (!hasPfxConfig) {
    push(
      checks,
      "cert.pfx",
      false,
      "ESOCIAL_CERT_PFX_PATH / ESOCIAL_CERT_PASSWORD não configurados (obrigatório para homologação real)",
    );
  } else {
    const abs = path.resolve(pfxPath);
    const exists = fs.existsSync(abs);
    push(checks, "cert.arquivo", exists, exists ? abs : `arquivo não encontrado: ${abs}`);
    if (exists) {
      try {
        const cert = certificateService.loadFromPath(abs, env.ESOCIAL_CERT_PASSWORD);
        push(
          checks,
          "cert.leitura",
          true,
          `CN=${cert.info.subjectCN}; validade até ${cert.info.notAfter}`,
        );
        try {
          const compat = certificateService.assertCompatibleWithEmployer(
            cert.info,
            env.ESOCIAL_EMPREGADOR_CNPJ || "00000000000000",
          );
          push(
            checks,
            "cert.cnpj_compat",
            cnpjOk,
            cnpjOk
              ? `modo=${compat.mode}`
              : "CNPJ empregador inválido — compatibilidade não conclusiva",
          );
        } catch (err) {
          push(
            checks,
            "cert.cnpj_compat",
            false,
            err instanceof Error ? err.message : String(err),
          );
        }

        // Assinatura local apenas — sem HTTP
        const unsigned = buildConsultaTabelaXml({
          tpInsc: "1",
          nrInsc: employerNrInsc(env.ESOCIAL_EMPREGADOR_CNPJ || "00000000000000"),
          tpEvt: "S-1000",
        });
        const signed = signEnvelopedXml(unsigned, cert.privateKeyPem, cert.certificatePem);
        assertEsocialSignatureShape(signed);
        const envelope = wrapSoapEnvelope(
          signed.replace(/^\s*<\?xml[^?]*\?>\s*/i, ""),
          serviceNs(),
          "ConsultarIdentificadoresEventosTabela",
        );
        push(
          checks,
          "xml.assinatura_local",
          true,
          `RSA-SHA256+C14N+Enveloped+X509Certificate; SOAPAction=${soapActionConsultarTabela()}`,
        );
        push(
          checks,
          "xml.envelope_tamanho",
          envelope.length > 100,
          `${envelope.length} bytes (não enviado)`,
        );
      } catch (err) {
        push(
          checks,
          "cert.leitura_ou_assinatura",
          false,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  push(
    checks,
    "rede.esocial",
    true,
    "este diagnóstico NÃO abre conexão com *.esocial.gov.br",
  );

  const failed = checks.filter((c) => !c.ok);
  console.log("\n---");
  console.log(
    failed.length === 0
      ? "Pré-homologação: checks obrigatórios OK (ainda é preciso certificado real + ALLOW_REAL_CALLS + confirmação do operador para a 1ª consulta)."
      : `Pré-homologação: ${failed.length} check(s) falharam. Corrija antes de liberar chamada real.`,
  );

  if (env.transportMock) {
    console.log(
      "Nota: ESOCIAL_TRANSPORT_MOCK=true — para homologação real, mude para false após passar o preflight com PFX.",
    );
  }

  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
