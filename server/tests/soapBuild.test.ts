import { describe, expect, it } from "vitest";
import {
  buildConsultaTabelaXml,
  buildDownloadPorIdXml,
  wrapSoapEnvelope,
} from "../src/services/soap/buildMessages.js";
import { soapActionConsultarTabela, soapActionDownloadPorId } from "../src/services/soap/endpoints.js";

describe("SOAP message build", () => {
  it("monta consulta S-1000 sem chEvt", () => {
    const xml = buildConsultaTabelaXml({
      tpInsc: "1",
      nrInsc: "12345678",
      tpEvt: "S-1000",
    });
    expect(xml).toContain("consultaEvtsTabela");
    expect(xml).toContain("<tpEvt>S-1000</tpEvt>");
    expect(xml).not.toContain("<chEvt>");
    expect(xml).toContain("identificadores-eventos/tabela/v1_0_0");
  });

  it("monta download por id limitado a 50", () => {
    const ids = Array.from({ length: 55 }, (_, i) => `ID${i}`);
    const xml = buildDownloadPorIdXml({ tpInsc: "1", nrInsc: "12345678", ids });
    expect((xml.match(/<id>/g) ?? []).length).toBe(50);
  });

  it("envolve método SOAP oficial", () => {
    const env = wrapSoapEnvelope("<eSocial/>", "http://ns", "ConsultarIdentificadoresEventosTabela");
    expect(env).toContain("ConsultarIdentificadoresEventosTabela");
    expect(env).toContain("<v1:consulta>");
    expect(soapActionConsultarTabela()).toContain("ConsultarIdentificadoresEventosTabela");
    expect(soapActionDownloadPorId()).toContain("SolicitarDownloadEventosPorId");
  });
});
