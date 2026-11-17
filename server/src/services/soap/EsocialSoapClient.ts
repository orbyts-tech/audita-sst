import https from "node:https";
import { randomUUID } from "node:crypto";
import type { LoadedCertificate } from "../certificate/CertificateService.js";
import { signEnvelopedXml, hasSignature } from "../xmldsig/signXml.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import {
  downloadServiceNs,
  ESOCIAL_ENDPOINTS,
  serviceNs,
  soapActionConsultarTabela,
  soapActionDownloadPorId,
  type EsocialAmbiente,
} from "./endpoints.js";
import {
  buildConsultaTabelaXml,
  buildDownloadPorIdXml,
  employerNrInsc,
  wrapSoapEnvelope,
} from "./buildMessages.js";
import {
  parseConsultaIdentificadoresResponse,
  parseDownloadResponse,
  type ConsultaIdentificadoresResult,
} from "./parseResponses.js";

export type SoapTransport = {
  post(opts: {
    url: string;
    soapAction: string;
    body: string;
    pfx: Buffer;
    passphrase: string;
    timeoutMs?: number;
  }): Promise<{ statusCode: number; body: string; durationMs: number }>;
};

const realTransport: SoapTransport = {
  async post({ url, soapAction, body, pfx, passphrase, timeoutMs = 60_000 }) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = https.request(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + u.search,
          method: "POST",
          pfx,
          passphrase,
          rejectUnauthorized: true,
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            SOAPAction: `"${soapAction}"`,
            "Content-Length": Buffer.byteLength(body, "utf8"),
          },
          timeout: timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            resolve({
              statusCode: res.statusCode ?? 0,
              body: Buffer.concat(chunks).toString("utf8"),
              durationMs: Date.now() - started,
            });
          });
        },
      );
      req.on("timeout", () => {
        req.destroy(new AppError("Timeout na chamada SOAP ao eSocial.", "SOAP_TIMEOUT", 504));
      });
      req.on("error", (err) => {
        reject(
          new AppError(
            `Indisponibilidade ao chamar eSocial: ${err.message}`,
            "SOAP_UNAVAILABLE",
            503,
          ),
        );
      });
      req.write(body);
      req.end();
    });
  },
};

export class EsocialSoapClient {
  constructor(
    private readonly ambiente: EsocialAmbiente,
    private readonly transport: SoapTransport = realTransport,
  ) {}

  async consultarIdentificadoresTabela(params: {
    cert: LoadedCertificate;
    employerCnpj: string;
    tpEvt: string;
    chEvt?: string;
  }): Promise<ConsultaIdentificadoresResult & { operationId: string }> {
    const operationId = randomUUID();
    const nrInsc = employerNrInsc(params.employerCnpj);
    const unsigned = buildConsultaTabelaXml({
      tpInsc: "1",
      nrInsc,
      tpEvt: params.tpEvt,
      chEvt: params.chEvt,
    });
    const signed = signEnvelopedXml(
      unsigned,
      params.cert.privateKeyPem,
      params.cert.certificatePem,
    );
    if (!hasSignature(signed)) {
      throw new AppError("XML de consulta sem assinatura.", "XMLDSIG_MISSING", 500);
    }

    // xsd:any: o eSocial assinado entra como filho XML de <consulta> (sem CDATA).
    const envelope = wrapSoapEnvelope(
      stripXmlDeclaration(signed),
      serviceNs(),
      "ConsultarIdentificadoresEventosTabela",
    );

    const url = ESOCIAL_ENDPOINTS[this.ambiente].consultaIdentificadores;
    const res = await this.transport.post({
      url,
      soapAction: soapActionConsultarTabela(),
      body: envelope,
      pfx: params.cert.pfxBuffer,
      passphrase: params.cert.password,
    });

    logger.info(
      {
        operationId,
        ambiente: this.ambiente,
        method: "ConsultarIdentificadoresEventosTabela",
        statusCode: res.statusCode,
        durationMs: res.durationMs,
      },
      "soap.call",
    );

    if (res.statusCode >= 500) {
      throw new AppError("eSocial indisponível.", "SOAP_UNAVAILABLE", 503);
    }

    const parsed = parseConsultaIdentificadoresResponse(res.body);
    return { ...parsed, operationId };
  }

  async downloadPorIds(params: {
    cert: LoadedCertificate;
    employerCnpj: string;
    ids: string[];
  }) {
    const operationId = randomUUID();
    const nrInsc = employerNrInsc(params.employerCnpj);
    const unsigned = buildDownloadPorIdXml({
      tpInsc: "1",
      nrInsc,
      ids: params.ids,
    });
    const signed = signEnvelopedXml(
      unsigned,
      params.cert.privateKeyPem,
      params.cert.certificatePem,
    );
    const envelope = wrapSoapEnvelope(
      stripXmlDeclaration(signed),
      downloadServiceNs(),
      "SolicitarDownloadEventosPorId",
    );
    const url = ESOCIAL_ENDPOINTS[this.ambiente].downloadEventos;
    const res = await this.transport.post({
      url,
      soapAction: soapActionDownloadPorId(),
      body: envelope,
      pfx: params.cert.pfxBuffer,
      passphrase: params.cert.password,
    });
    logger.info(
      {
        operationId,
        ambiente: this.ambiente,
        method: "SolicitarDownloadEventosPorId",
        statusCode: res.statusCode,
        durationMs: res.durationMs,
        idsCount: params.ids.length,
      },
      "soap.call",
    );
    const parsed = parseDownloadResponse(res.body);
    return { ...parsed, operationId };
  }
}

function stripXmlDeclaration(xml: string): string {
  return xml.replace(/^\s*<\?xml[^?]*\?>\s*/i, "");
}
