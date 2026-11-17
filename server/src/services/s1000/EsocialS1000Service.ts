import { getEnv } from "../../config/env.js";
import { getStore } from "../../db/store.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { certificateService } from "../certificate/CertificateService.js";
import { quotaManager } from "../quota/QuotaManager.js";
import { EsocialSoapClient } from "../soap/EsocialSoapClient.js";
import { normalizeS1000 } from "../soap/parseResponses.js";
import { xmlStorage } from "../storage/XmlStorage.js";
import { createMockTransport } from "../soap/mockTransport.js";

export class EsocialS1000Service {
  async consultar(companyId: string) {
    const env = getEnv();
    if (!env.allowedCompanyIds.has(companyId)) {
      throw new AppError("Empresa não autorizada para eSocial.", "FORBIDDEN_COMPANY", 403);
    }

    const employerCnpj = env.ESOCIAL_EMPREGADOR_CNPJ;
    if (!employerCnpj || employerCnpj.length !== 14) {
      throw new AppError(
        "ESOCIAL_EMPREGADOR_CNPJ não configurado (14 dígitos).",
        "CONFIG_CNPJ",
        400,
      );
    }

    // Gates locais ANTES de quota/lock — não consomem acesso ao governo.
    if (!env.transportMock && !env.allowRealCalls) {
      throw new AppError(
        "Chamada real ao eSocial bloqueada. Defina ESOCIAL_ALLOW_REAL_CALLS=yes após o diagnóstico de pré-homologação.",
        "REAL_CALLS_BLOCKED",
        403,
      );
    }
    if (!env.transportMock && (!env.ESOCIAL_CERT_PFX_PATH || !env.ESOCIAL_CERT_PASSWORD)) {
      throw new AppError(
        "Certificado A1 não configurado (ESOCIAL_CERT_PFX_PATH / ESOCIAL_CERT_PASSWORD).",
        "CERT_NOT_CONFIGURED",
        400,
      );
    }

    const store = getStore();
    const consulta = await store.createConsulta({
      companyId,
      ambiente: env.ESOCIAL_AMBIENTE,
      eventType: "S-1000",
      status: "pendente",
    });
    await store.audit("esocial.consulta.created", { companyId, consultaId: consulta.id });

    const slot = await quotaManager.acquireSlot(companyId);
    try {
      await store.updateConsulta(consulta.id, { status: "consultando" });

      let cert;
      if (env.ESOCIAL_CERT_PFX_PATH && env.ESOCIAL_CERT_PASSWORD) {
        cert = certificateService.loadFromPath(
          env.ESOCIAL_CERT_PFX_PATH,
          env.ESOCIAL_CERT_PASSWORD,
        );
        certificateService.assertCompatibleWithEmployer(cert.info, employerCnpj);
      } else if (env.transportMock) {
        cert = certificateService.createEphemeralDevCertificate(employerCnpj);
      } else {
        throw new AppError(
          "Certificado A1 não configurado (ESOCIAL_CERT_PFX_PATH / ESOCIAL_CERT_PASSWORD).",
          "CERT_NOT_CONFIGURED",
          400,
        );
      }

      // MOCK=false → sempre transporte HTTPS real; sem fallback silencioso.
      const client = env.transportMock
        ? new EsocialSoapClient(env.ESOCIAL_AMBIENTE, createMockTransport())
        : new EsocialSoapClient(env.ESOCIAL_AMBIENTE);

      await slot.consume();
      const consultaResult = await client.consultarIdentificadoresTabela({
        cert,
        employerCnpj,
        tpEvt: "S-1000",
        // chEvt vazio para S-1000 (manual §7.7.15)
      });

      await store.updateConsulta(consulta.id, {
        cdResposta: consultaResult.cdResposta,
        descResposta: consultaResult.descResposta,
      });

      const authCodes = new Set(["401", "407", "411"]);
      const emptyCodes = new Set(["406"]);
      const successCodes = new Set(["201", "203"]);

      if (authCodes.has(consultaResult.cdResposta)) {
        await store.updateConsulta(consulta.id, {
          status: "falha_autorizacao",
          errorCode: consultaResult.cdResposta,
          errorMessage: consultaResult.descResposta,
          finishedAt: new Date().toISOString(),
        });
        throw new AppError(
          consultaResult.descResposta || "Falha de autorização no eSocial.",
          "ESOCIAL_AUTH",
          403,
          { cdResposta: consultaResult.cdResposta },
        );
      }

      if (
        emptyCodes.has(consultaResult.cdResposta) ||
        (successCodes.has(consultaResult.cdResposta) &&
          consultaResult.identificadores.length === 0)
      ) {
        await store.updateConsulta(consulta.id, {
          status: "concluida_sem_registros",
          finishedAt: new Date().toISOString(),
        });
        return {
          consultaId: consulta.id,
          status: "concluida_sem_registros" as const,
          message: "Nenhum evento encontrado para a consulta realizada",
          cdResposta: consultaResult.cdResposta,
          descResposta: consultaResult.descResposta,
          ambiente: env.ESOCIAL_AMBIENTE,
          transportMock: env.transportMock,
          identificadores: [],
          eventos: [],
        };
      }

      if (!successCodes.has(consultaResult.cdResposta)) {
        await store.updateConsulta(consulta.id, {
          status: "falha_tecnica",
          errorCode: consultaResult.cdResposta,
          errorMessage: consultaResult.descResposta,
          finishedAt: new Date().toISOString(),
        });
        throw new AppError(
          consultaResult.descResposta || "Falha na consulta eSocial.",
          "ESOCIAL_ERROR",
          502,
          { cdResposta: consultaResult.cdResposta },
        );
      }

      if (consultaResult.identificadores.length === 0) {
        await store.updateConsulta(consulta.id, {
          status: "concluida_sem_registros",
          finishedAt: new Date().toISOString(),
        });
        return {
          consultaId: consulta.id,
          status: "concluida_sem_registros" as const,
          message: "Nenhum evento encontrado para a consulta realizada",
          cdResposta: consultaResult.cdResposta,
          descResposta: consultaResult.descResposta,
          ambiente: env.ESOCIAL_AMBIENTE,
          transportMock: env.transportMock,
          identificadores: [],
          eventos: [],
        };
      }

      await store.updateConsulta(consulta.id, { status: "identificadores_encontrados" });
      const ids = consultaResult.identificadores.slice(0, 50);
      await store.addIdentificadores(
        ids.map((i) => ({
          consultaId: consulta.id,
          companyId,
          eventType: "S-1000",
          eventId: i.id,
          nrRecibo: i.nrRec,
        })),
      );

      await store.updateConsulta(consulta.id, { status: "baixando_xml" });
      await slot.consume();
      const download = await client.downloadPorIds({
        cert,
        employerCnpj,
        ids: ids.map((i) => i.id),
      });

      const eventosSalvos = [];
      for (const item of download.eventos) {
        const xml = item.xmlEvento;
        if (!xml) continue;
        const eventId = item.id || ids[0]?.id || "unknown";
        const stored = await xmlStorage.saveXml({
          companyId,
          eventType: "S-1000",
          eventId,
          xml,
        });
        const payload = normalizeS1000(xml);
        const evento = await store.upsertEvento({
          companyId,
          consultaId: consulta.id,
          ambiente: env.ESOCIAL_AMBIENTE,
          origem: "soap_download",
          eventType: "S-1000",
          eventId,
          nrRecibo: item.nrRec,
          dataConsulta: new Date().toISOString(),
          situacao: "disponivel",
          xmlSha256: stored.sha256,
          storagePath: stored.storagePath,
          payloadJson: payload,
        });
        eventosSalvos.push(evento);
      }

      const statusFinal =
        eventosSalvos.length > 0 ? "concluida_com_dados" : "concluida_sem_registros";
      await store.updateConsulta(consulta.id, {
        status: statusFinal,
        finishedAt: new Date().toISOString(),
        cdResposta: download.cdResposta || consultaResult.cdResposta,
        descResposta: download.descResposta || consultaResult.descResposta,
      });

      // Descartar referências sensíveis ao fim
      (cert as { password?: string }).password = undefined;

      return {
        consultaId: consulta.id,
        status: statusFinal,
        message:
          statusFinal === "concluida_sem_registros"
            ? "Nenhum evento encontrado para a consulta realizada"
            : undefined,
        cdResposta: consultaResult.cdResposta,
        descResposta: consultaResult.descResposta,
        ambiente: env.ESOCIAL_AMBIENTE,
        transportMock: env.transportMock,
        certificado: {
          subjectCN: cert.info.subjectCN,
          notAfter: cert.info.notAfter,
        },
        identificadores: ids,
        eventos: eventosSalvos.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          eventId: e.eventId,
          nrRecibo: e.nrRecibo,
          dataConsulta: e.dataConsulta,
          xmlSha256: e.xmlSha256,
          payload: e.payloadJson,
        })),
      };
    } catch (err) {
      const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
      const status =
        code === "QUOTA_DAILY_EXCEEDED" ||
        code === "QUOTA_CALENDAR_BLOCK" ||
        code === "QUOTA_PARALLEL"
          ? "quota_indisponivel"
          : code.startsWith("CERT") || code === "ESOCIAL_AUTH" || code === "FORBIDDEN_COMPANY"
            ? "falha_autorizacao"
            : "falha_tecnica";
      await store.updateConsulta(consulta.id, {
        status,
        errorCode: code,
        errorMessage: err instanceof Error ? err.message : "erro",
        finishedAt: new Date().toISOString(),
      });
      logger.error({ companyId, consultaId: consulta.id, code }, "s1000.failed");
      throw err;
    } finally {
      await slot.release();
    }
  }
}

export const esocialS1000Service = new EsocialS1000Service();
