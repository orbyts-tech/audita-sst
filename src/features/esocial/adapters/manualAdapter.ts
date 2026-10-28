import { ESOCIAL_CONFIG } from "../config";
import type { AcquisitionBatch, AcquisitionRequest, CoverageInterval } from "../types";
import type { SourceAdapter } from "./SourceAdapter";

function validateFiles(files: AcquisitionRequest["files"]) {
  const { maxArquivoBytes, maxArquivosPorLote, extensoesPermitidas } = ESOCIAL_CONFIG.importacao;
  if (files.length === 0) throw new Error("Selecione ao menos um arquivo XML ou ZIP.");
  if (files.length > maxArquivosPorLote) {
    throw new Error(`Máximo de ${maxArquivosPorLote} arquivos por lote.`);
  }
  for (const f of files) {
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
    if (!(extensoesPermitidas as readonly string[]).includes(ext)) {
      throw new Error(`Extensão não permitida: ${f.name}`);
    }
    if (f.size > maxArquivoBytes) {
      throw new Error(`Arquivo excede o tamanho máximo: ${f.name}`);
    }
  }
}

function createManualAdapter(source: "manual_xml" | "manual_zip"): SourceAdapter {
  return {
    source,
    async acquire(request) {
      validateFiles(request.files);
      const agora = new Date().toISOString();
      const batch: AcquisitionBatch = {
        id: `batch-${Date.now()}`,
        companyId: request.companyId,
        source,
        status: "queued",
        phase: "enviando",
        requestedAt: agora,
        fileNames: request.files.map((f) => f.name),
        totals: {
          arquivosRecebidos: request.files.length,
          eventosValidos: 0,
          eventosDuplicados: 0,
          eventosNaoReconhecidos: 0,
          erros: 0,
        },
        coverageLabel: "Aguardando processamento",
        errors: [],
        partial: false,
      };
      return batch;
    },
    describeCoverage(batch): CoverageInterval[] {
      if (batch.status === "queued") return [];
      return [
        {
          batchId: batch.id,
          intervalStart: "2024-01-01",
          intervalEnd: "2025-04-14",
          intervalType: "entrega",
          status: batch.partial ? "parcial" : "suficiente",
        },
      ];
    },
    status(batch) {
      return batch.status;
    },
  };
}

export const manualXmlAdapter = createManualAdapter("manual_xml");
export const manualZipAdapter = createManualAdapter("manual_zip");

/** Stub SOAP — preparado para fase posterior (sem conexão real). */
export const soapAdapter: SourceAdapter = {
  source: "soap",
  async acquire() {
    throw new Error(
      "Webservice SOAP ainda não habilitado. Use importação manual de XML/ZIP no MVP.",
    );
  },
  describeCoverage() {
    return [];
  },
  status() {
    return "failed";
  },
};

export function getAdapter(source: AcquisitionRequest["source"]): SourceAdapter {
  switch (source) {
    case "manual_zip":
      return manualZipAdapter;
    case "soap":
      return soapAdapter;
    default:
      return manualXmlAdapter;
  }
}
