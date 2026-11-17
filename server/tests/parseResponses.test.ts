import { describe, expect, it } from "vitest";
import {
  normalizeS1000,
  parseConsultaIdentificadoresResponse,
  parseDownloadResponse,
} from "../src/services/soap/parseResponses.js";
import { AppError } from "../src/lib/errors.js";

describe("parseConsultaIdentificadoresResponse", () => {
  it("parseia identificadores com sucesso", () => {
    const xml = `<?xml version="1.0"?><eSocial xmlns="http://www.esocial.gov.br/schema/consulta/identificadores-eventos/retorno/v1_0_0"><retornoConsultaIdentificadoresEvts><status><cdResposta>201</cdResposta><descResposta>Consulta realizada com sucesso.</descResposta></status><retornoIdentificadoresEvts><qtdeTotEvtsConsulta>1</qtdeTotEvtsConsulta><identificadoresEvts><identificadorEvt><id>ID1</id><nrRec>1.1.1</nrRec></identificadorEvt></identificadoresEvts></retornoIdentificadoresEvts></retornoConsultaIdentificadoresEvts></eSocial>`;
    const r = parseConsultaIdentificadoresResponse(xml);
    expect(r.cdResposta).toBe("201");
    expect(r.identificadores).toHaveLength(1);
    expect(r.identificadores[0]?.id).toBe("ID1");
  });

  it("parseia resposta sem registros", () => {
    const xml = `<?xml version="1.0"?><eSocial><retornoConsultaIdentificadoresEvts><status><cdResposta>406</cdResposta><descResposta>Não foram encontrados registros conforme os filtros informados.</descResposta></status></retornoConsultaIdentificadoresEvts></eSocial>`;
    const r = parseConsultaIdentificadoresResponse(xml);
    expect(r.cdResposta).toBe("406");
    expect(r.identificadores).toHaveLength(0);
  });

  it("lança em SOAP Fault", () => {
    const xml = `<?xml version="1.0"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><soap:Fault><faultstring>erro</faultstring></soap:Fault></soap:Body></soap:Envelope>`;
    expect(() => parseConsultaIdentificadoresResponse(xml)).toThrow(AppError);
  });

  it("preserva código de autorização 407 sem inventar identificadores", () => {
    const xml = `<?xml version="1.0"?><eSocial><retornoConsultaIdentificadoresEvts><status><cdResposta>407</cdResposta><descResposta>Acesso não autorizado.</descResposta></status></retornoConsultaIdentificadoresEvts></eSocial>`;
    const r = parseConsultaIdentificadoresResponse(xml);
    expect(r.cdResposta).toBe("407");
    expect(r.identificadores).toHaveLength(0);
    expect(r.descResposta).toMatch(/autorizado/i);
  });
});

describe("normalizeS1000", () => {
  it("extrai campos presentes sem inventar", () => {
    const xml = `<?xml version="1.0"?><eSocial><evtInfoEmpregador Id="IDX"><ideEmpregador><tpInsc>1</tpInsc><nrInsc>12345678</nrInsc></ideEmpregador><infoCadastro><classTrib>01</classTrib></infoCadastro></evtInfoEmpregador></eSocial>`;
    const n = normalizeS1000(xml);
    expect(n.eventType).toBe("S-1000");
    expect(n.nrInsc).toBe("12345678");
    expect(n.classTrib).toBe("01");
    expect(n).not.toHaveProperty("razaoSocial");
  });
});

describe("parseDownloadResponse", () => {
  it("extrai arquivo do download", () => {
    const xml = `<?xml version="1.0"?><eSocial><status><cdResposta>201</cdResposta><descResposta>ok</descResposta></status><evento><id>ID1</id><nrRec>R1</nrRec><arquivo>XMLCONTENT</arquivo></evento></eSocial>`;
    const r = parseDownloadResponse(xml);
    expect(r.eventos[0]?.xmlEvento).toBe("XMLCONTENT");
  });
});
