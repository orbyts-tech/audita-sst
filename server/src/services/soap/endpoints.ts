export type EsocialAmbiente = "producao_restrita" | "producao";

/** Pacote Comunicação v1.6 / Manual v1.16 — URLs oficiais. */
export const ESOCIAL_ENDPOINTS = {
  producao: {
    consultaIdentificadores:
      "https://webservices.download.esocial.gov.br/servicos/empregador/dwlcirurgico/WsConsultarIdentificadoresEventos.svc",
    downloadEventos:
      "https://webservices.download.esocial.gov.br/servicos/empregador/dwlcirurgico/WsSolicitarDownloadEventos.svc",
  },
  producao_restrita: {
    consultaIdentificadores:
      "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/dwlcirurgico/WsConsultarIdentificadoresEventos.svc",
    downloadEventos:
      "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/dwlcirurgico/WsSolicitarDownloadEventos.svc",
  },
} as const;

/** Versão do serviço de comunicação (WSDL v1.1.0 no pacote 1.6). */
export const SERVICE_NS_VERSION = "v1_1_0";

export const CONSULTA_TABELA_NS =
  "http://www.esocial.gov.br/schema/consulta/identificadores-eventos/tabela/v1_0_0";
export const DOWNLOAD_ID_NS =
  "http://www.esocial.gov.br/schema/download/solicitacao/id/v1_0_0";
export const RETORNO_CONSULTA_NS =
  "http://www.esocial.gov.br/schema/consulta/identificadores-eventos/retorno/v1_0_0";

export function soapActionConsultarTabela() {
  return `http://www.esocial.gov.br/servicos/empregador/consulta/identificadores-eventos/${SERVICE_NS_VERSION}/ServicoConsultarIdentificadoresEventos/ConsultarIdentificadoresEventosTabela`;
}

export function soapActionDownloadPorId() {
  return `http://www.esocial.gov.br/servicos/empregador/download/eventos/${SERVICE_NS_VERSION}/ServicoSolicitarDownloadEventos/SolicitarDownloadEventosPorId`;
}

export function serviceNs() {
  return `http://www.esocial.gov.br/servicos/empregador/consulta/identificadores-eventos/${SERVICE_NS_VERSION}`;
}

export function downloadServiceNs() {
  return `http://www.esocial.gov.br/servicos/empregador/download/eventos/${SERVICE_NS_VERSION}`;
}
