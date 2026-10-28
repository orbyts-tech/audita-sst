import type { AcquisitionBatch, PipelinePhase } from "../types";

const PHASES: { phase: PipelinePhase; status: AcquisitionBatch["status"]; ms: number }[] = [
  { phase: "enviando", status: "retrieving", ms: 400 },
  { phase: "validando", status: "validating", ms: 500 },
  { phase: "lendo_xmls", status: "parsing", ms: 700 },
  { phase: "atualizando_vinculos", status: "reconciling", ms: 600 },
  { phase: "auditando", status: "auditing", ms: 500 },
  { phase: "concluido", status: "partial", ms: 200 },
];

export type ImportProgressHandler = (batch: AcquisitionBatch) => void;

/**
 * Simula o pipeline de ingestão (MVP sem worker/API).
 * Idempotência e totais são mockados de forma determinística a partir dos nomes.
 */
export async function simulateImportPipeline(
  batch: AcquisitionBatch,
  onProgress: ImportProgressHandler,
): Promise<AcquisitionBatch> {
  let current = { ...batch };
  const zip = batch.fileNames.some((n) => n.toLowerCase().endsWith(".zip"));
  const baseEvents = zip ? 40 + batch.fileNames.length * 4 : Math.max(1, batch.fileNames.length);

  for (const step of PHASES) {
    await wait(step.ms);
    current = {
      ...current,
      phase: step.phase,
      status: step.status,
      totals: {
        ...current.totals,
        eventosValidos: step.phase === "concluido" ? baseEvents : current.totals.eventosValidos,
        eventosDuplicados: step.phase === "concluido" ? 1 : current.totals.eventosDuplicados,
        eventosNaoReconhecidos:
          step.phase === "concluido" ? (zip ? 1 : 0) : current.totals.eventosNaoReconhecidos,
        erros: 0,
      },
      coverageLabel:
        step.phase === "concluido"
          ? "Entrega parcial (simulada) — não cobre todo o histórico"
          : current.coverageLabel,
      partial: step.phase === "concluido",
      completedAt: step.phase === "concluido" ? new Date().toISOString() : current.completedAt,
    };
    onProgress(current);
  }

  return current;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const PIPELINE_PHASE_LABELS: Record<PipelinePhase, string> = {
  enviando: "Enviando",
  validando: "Validando",
  lendo_xmls: "Lendo XMLs",
  atualizando_vinculos: "Atualizando vínculos",
  auditando: "Auditando",
  concluido: "Concluído",
};
