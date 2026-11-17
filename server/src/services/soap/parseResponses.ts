import { DOMParser, type Element as XmlElement, type Node as XmlNode } from "@xmldom/xmldom";
import { AppError } from "../../lib/errors.js";

export type IdentificadorEvt = { id: string; nrRec?: string };

export type ConsultaIdentificadoresResult = {
  cdResposta: string;
  descResposta: string;
  qtdeTotEvtsConsulta?: number;
  dhUltimoEvtRetornado?: string;
  identificadores: IdentificadorEvt[];
  rawXml: string;
};

function text(el: XmlElement | null | undefined): string {
  return (el?.textContent ?? "").trim();
}

function findAll(root: XmlElement, localName: string): XmlElement[] {
  const out: XmlElement[] = [];
  const walk = (node: XmlNode) => {
    if (node.nodeType === 1) {
      const el = node as XmlElement;
      if (
        el.localName === localName ||
        el.nodeName === localName ||
        el.nodeName.endsWith(`:${localName}`)
      ) {
        out.push(el);
      }
      for (let i = 0; i < el.childNodes.length; i++) walk(el.childNodes[i]!);
    }
  };
  walk(root);
  return out;
}

function findFirst(root: XmlElement, localName: string): XmlElement | null {
  return findAll(root, localName)[0] ?? null;
}

export function parseConsultaIdentificadoresResponse(xml: string): ConsultaIdentificadoresResult {
  if (/Fault|faultstring/i.test(xml) && /soap/i.test(xml)) {
    const docFault = new DOMParser().parseFromString(xml, "text/xml");
    const fault = findFirst(docFault.documentElement!, "faultstring");
    throw new AppError(
      text(fault) || "SOAP Fault na consulta de identificadores.",
      "SOAP_FAULT",
      502,
    );
  }

  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  if (!root) throw new AppError("Resposta XML vazia.", "SOAP_EMPTY", 502);

  const status = findFirst(root, "status");
  const cdResposta = text(findFirst(status ?? root, "cdResposta"));
  const descResposta = text(findFirst(status ?? root, "descResposta"));

  const retornoIds = findFirst(root, "retornoIdentificadoresEvts");
  const qtdeTot = text(findFirst(retornoIds ?? root, "qtdeTotEvtsConsulta"));
  const dhUltimo = text(findFirst(retornoIds ?? root, "dhUltimoEvtRetornado"));

  const identificadores: IdentificadorEvt[] = findAll(root, "identificadorEvt")
    .map((el) => ({
      id: text(findFirst(el, "id")),
      nrRec: text(findFirst(el, "nrRec")) || undefined,
    }))
    .filter((i) => i.id);

  return {
    cdResposta,
    descResposta,
    qtdeTotEvtsConsulta: qtdeTot ? Number(qtdeTot) : undefined,
    dhUltimoEvtRetornado: dhUltimo || undefined,
    identificadores,
    rawXml: xml,
  };
}

export type DownloadEventoItem = {
  id?: string;
  nrRec?: string;
  xmlEvento?: string;
  xmlRecibo?: string;
};

export function parseDownloadResponse(xml: string): {
  cdResposta: string;
  descResposta: string;
  eventos: DownloadEventoItem[];
  rawXml: string;
} {
  if (/Fault|faultstring/i.test(xml) && /soap/i.test(xml)) {
    const docFault = new DOMParser().parseFromString(xml, "text/xml");
    const fault = findFirst(docFault.documentElement!, "faultstring");
    throw new AppError(text(fault) || "SOAP Fault no download.", "SOAP_FAULT", 502);
  }
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const root = doc.documentElement!;
  const status = findFirst(root, "status");
  const cdResposta = text(findFirst(status ?? root, "cdResposta"));
  const descResposta = text(findFirst(status ?? root, "descResposta"));

  const eventos = findAll(root, "evento").map((el) => ({
    id: text(findFirst(el, "id")) || undefined,
    nrRec: text(findFirst(el, "nrRec")) || undefined,
    xmlEvento: text(findFirst(el, "arquivo")) || text(findFirst(el, "evt")) || undefined,
    xmlRecibo: text(findFirst(el, "recibo")) || undefined,
  }));

  return { cdResposta, descResposta, eventos, rawXml: xml };
}

/** Extrai campos conhecidos do S-1000 sem inventar dados. */
export function normalizeS1000(xml: string): Record<string, unknown> {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  if (!root) return {};
  const out: Record<string, unknown> = { eventType: "S-1000" };
  const idEvt = findFirst(root, "evtInfoEmpregador") ?? findFirst(root, "ideEvento");
  const idAttr = findFirst(root, "evtInfoEmpregador")?.getAttribute("Id") ?? undefined;
  if (idAttr) out.eventId = idAttr;

  const nrInsc = text(findFirst(root, "nrInsc"));
  const tpInsc = text(findFirst(root, "tpInsc"));
  const classTrib = text(findFirst(root, "classTrib"));
  const indCoop = text(findFirst(root, "indCoop"));
  const indConstr = text(findFirst(root, "indConstr"));
  const indDesFolha = text(findFirst(root, "indDesFolha"));
  const indOptRegEletron = text(findFirst(root, "indOptRegEletron"));

  if (tpInsc) out.tpInsc = tpInsc;
  if (nrInsc) out.nrInsc = nrInsc;
  if (classTrib) out.classTrib = classTrib;
  if (indCoop) out.indCoop = indCoop;
  if (indConstr) out.indConstr = indConstr;
  if (indDesFolha) out.indDesFolha = indDesFolha;
  if (indOptRegEletron) out.indOptRegEletron = indOptRegEletron;
  if (idEvt) out.hasEvtInfoEmpregador = true;
  return out;
}
