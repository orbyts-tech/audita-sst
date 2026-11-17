import type { SoapTransport } from "./EsocialSoapClient.js";

/**
 * Transporte mock para testes/CI — NÃO é resposta do governo.
 * Identificado explicitamente via ESOCIAL_TRANSPORT_MOCK=true.
 */
export function createMockTransport(scenario: "with_ids" | "empty" | "fault" = "with_ids"): SoapTransport {
  return {
    async post({ soapAction }) {
      const started = Date.now();
      if (scenario === "fault" || soapAction.includes("Fault")) {
        return {
          statusCode: 500,
          durationMs: Date.now() - started,
          body: `<?xml version="1.0"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><soap:Fault><faultstring>Mock SOAP Fault</faultstring></soap:Fault></soap:Body></soap:Envelope>`,
        };
      }

      if (soapAction.includes("ConsultarIdentificadoresEventosTabela")) {
        if (scenario === "empty") {
          return {
            statusCode: 200,
            durationMs: Date.now() - started,
            body: `<?xml version="1.0"?><eSocial xmlns="http://www.esocial.gov.br/schema/consulta/identificadores-eventos/retorno/v1_0_0"><retornoConsultaIdentificadoresEvts><status><cdResposta>406</cdResposta><descResposta>Não foram encontrados registros conforme os filtros informados.</descResposta></status></retornoConsultaIdentificadoresEvts></eSocial>`,
          };
        }
        return {
          statusCode: 200,
          durationMs: Date.now() - started,
          body: `<?xml version="1.0"?><eSocial xmlns="http://www.esocial.gov.br/schema/consulta/identificadores-eventos/retorno/v1_0_0"><retornoConsultaIdentificadoresEvts><status><cdResposta>201</cdResposta><descResposta>Consulta realizada com sucesso.</descResposta></status><retornoIdentificadoresEvts><qtdeTotEvtsConsulta>1</qtdeTotEvtsConsulta><dhUltimoEvtRetornado>2024-01-15T10:00:00</dhUltimoEvtRetornado><identificadoresEvts><identificadorEvt><id>ID100012345678000000000000000000000000000001</id><nrRec>1.1.20240115.0000001</nrRec></identificadorEvt></identificadoresEvts></retornoIdentificadoresEvts></retornoConsultaIdentificadoresEvts></eSocial>`,
        };
      }

      // Download
      const s1000Xml = `<?xml version="1.0" encoding="utf-8"?><eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtInfoEmpregador/v_S_01_03_00"><evtInfoEmpregador Id="ID100012345678000000000000000000000000000001"><ideEvento><tpAmb>2</tpAmb><procEmi>1</procEmi><verProc>audita-sst-mock</verProc></ideEvento><ideEmpregador><tpInsc>1</tpInsc><nrInsc>12345678</nrInsc></ideEmpregador><infoCadastro><classTrib>01</classTrib><indCoop>0</indCoop><indConstr>0</indConstr><indDesFolha>0</indDesFolha><indOptRegEletron>0</indOptRegEletron></infoCadastro></evtInfoEmpregador></eSocial>`;
      return {
        statusCode: 200,
        durationMs: Date.now() - started,
        body: `<?xml version="1.0"?><eSocial xmlns="http://www.esocial.gov.br/schema/download/retorno/v1_0_0"><retornoDownload><status><cdResposta>201</cdResposta><descResposta>Sucesso</descResposta></status><retornoEventosDownload><evento><id>ID100012345678000000000000000000000000000001</id><nrRec>1.1.20240115.0000001</nrRec><arquivo><![CDATA[${s1000Xml}]]></arquivo></evento></retornoEventosDownload></retornoDownload></eSocial>`,
      };
    },
  };
}
