import { CONSULTA_TABELA_NS, DOWNLOAD_ID_NS } from "./endpoints.js";

/** nrInsc para empregador CNPJ: raiz de 8 dígitos conforme prática do download (base). */
export function employerNrInsc(cnpj14: string): string {
  const d = cnpj14.replace(/\D/g, "");
  return d.slice(0, 8);
}

/**
 * ConsultaIdentificadoresEventosTabela — S-1000 com chEvt vazio (manual §7.7.15).
 * Sem dtIni/dtFim: eventos de tabela não usam o filtro temporal de trabalhador.
 */
export function buildConsultaTabelaXml(params: {
  tpInsc: "1" | "2";
  nrInsc: string;
  tpEvt: string;
  chEvt?: string;
}): string {
  const ch = params.chEvt
    ? `<chEvt>${escapeXml(params.chEvt)}</chEvt>`
    : "";
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<eSocial xmlns="${CONSULTA_TABELA_NS}">` +
    `<consultaIdentificadoresEvts>` +
    `<ideEmpregador>` +
    `<tpInsc>${params.tpInsc}</tpInsc>` +
    `<nrInsc>${escapeXml(params.nrInsc)}</nrInsc>` +
    `</ideEmpregador>` +
    `<consultaEvtsTabela>` +
    `<tpEvt>${escapeXml(params.tpEvt)}</tpEvt>` +
    ch +
    `</consultaEvtsTabela>` +
    `</consultaIdentificadoresEvts>` +
    `</eSocial>`
  );
}

export function buildDownloadPorIdXml(params: {
  tpInsc: "1" | "2";
  nrInsc: string;
  ids: string[];
}): string {
  const idsXml = params.ids
    .slice(0, 50)
    .map((id) => `<id>${escapeXml(id)}</id>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<eSocial xmlns="${DOWNLOAD_ID_NS}">` +
    `<download>` +
    `<ideEmpregador>` +
    `<tpInsc>${params.tpInsc}</tpInsc>` +
    `<nrInsc>${escapeXml(params.nrInsc)}</nrInsc>` +
    `</ideEmpregador>` +
    `<solicDownloadEvtsPorId>` +
    idsXml +
    `</solicDownloadEvtsPorId>` +
    `</download>` +
    `</eSocial>`
  );
}

export function wrapSoapEnvelope(bodyInner: string, xmlnsV1: string, method: string): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="${xmlnsV1}">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>` +
    `<v1:${method}>` +
    `<v1:consulta>${bodyInner}</v1:consulta>` +
    `</v1:${method}>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
