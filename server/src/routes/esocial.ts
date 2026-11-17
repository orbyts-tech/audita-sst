import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { assertCompanyAccess, requireAuth } from "../auth/middleware.js";
import { getEnv } from "../config/env.js";
import { getStore } from "../db/store.js";
import { AppError, toErrorResponse } from "../lib/errors.js";
import { certificateService } from "../services/certificate/CertificateService.js";
import { esocialS1000Service } from "../services/s1000/EsocialS1000Service.js";
import { xmlStorage } from "../services/storage/XmlStorage.js";

const consultaBody = z.object({
  eventType: z.literal("S-1000"),
});

export async function esocialRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/empresas/:id/esocial/certificado/status", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      assertCompanyAccess(id);
      const env = getEnv();
      if (!env.ESOCIAL_CERT_PFX_PATH) {
        return {
          configured: false,
          ambiente: env.ESOCIAL_AMBIENTE,
          transportMock: env.transportMock,
          message: env.transportMock
            ? "Sem PFX: modo mock usará certificado efêmero apenas para assinatura local."
            : "Certificado A1 não configurado no servidor.",
        };
      }
      const cert = certificateService.loadFromPath(
        env.ESOCIAL_CERT_PFX_PATH,
        env.ESOCIAL_CERT_PASSWORD,
      );
      return {
        configured: true,
        ambiente: env.ESOCIAL_AMBIENTE,
        subjectCN: cert.info.subjectCN,
        notBefore: cert.info.notBefore,
        notAfter: cert.info.notAfter,
        cnpjBase: cert.info.cnpjBase,
        transportMock: env.transportMock,
      };
    } catch (err) {
      const mapped = toErrorResponse(err);
      return reply.status(mapped.statusCode).send(mapped.body);
    }
  });

  app.post("/api/empresas/:id/esocial/consultas", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      assertCompanyAccess(id);
      consultaBody.parse(req.body ?? {});
      const result = await esocialS1000Service.consultar(id);
      return result;
    } catch (err) {
      const mapped = toErrorResponse(err);
      return reply.status(mapped.statusCode).send(mapped.body);
    }
  });

  app.get("/api/empresas/:id/esocial/consultas/:consultaId", async (req, reply) => {
    try {
      const { id, consultaId } = req.params as { id: string; consultaId: string };
      assertCompanyAccess(id);
      const store = getStore();
      const consulta = await store.getConsulta(consultaId, id);
      if (!consulta) throw new AppError("Consulta não encontrada.", "NOT_FOUND", 404);
      const identificadores = await store.listIdentificadores(consultaId, id);
      return { consulta, identificadores };
    } catch (err) {
      const mapped = toErrorResponse(err);
      return reply.status(mapped.statusCode).send(mapped.body);
    }
  });

  app.get("/api/empresas/:id/esocial/eventos", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      assertCompanyAccess(id);
      const q = req.query as { tipo?: string };
      const eventos = await getStore().listEventos(id, q.tipo);
      return {
        items: eventos.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          eventId: e.eventId,
          nrRecibo: e.nrRecibo,
          dataConsulta: e.dataConsulta,
          situacao: e.situacao,
          xmlSha256: e.xmlSha256,
          payload: e.payloadJson,
          origem: e.origem,
          ambiente: e.ambiente,
        })),
      };
    } catch (err) {
      const mapped = toErrorResponse(err);
      return reply.status(mapped.statusCode).send(mapped.body);
    }
  });

  app.get("/api/empresas/:id/esocial/eventos/:eventoId", async (req, reply) => {
    try {
      const { id, eventoId } = req.params as { id: string; eventoId: string };
      assertCompanyAccess(id);
      const evento = await getStore().getEvento(id, eventoId);
      if (!evento) throw new AppError("Evento não encontrado.", "NOT_FOUND", 404);
      const includeXml = (req.query as { xml?: string }).xml === "1";
      let xml: string | undefined;
      if (includeXml) {
        xml = await xmlStorage.readXml(evento.storagePath);
      }
      return {
        ...evento,
        xml: includeXml ? xml : undefined,
      };
    } catch (err) {
      const mapped = toErrorResponse(err);
      return reply.status(mapped.statusCode).send(mapped.body);
    }
  });
}
