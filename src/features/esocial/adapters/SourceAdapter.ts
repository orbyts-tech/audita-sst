import type {
  AcquisitionBatch,
  AcquisitionRequest,
  CoverageInterval,
  SourceKind,
} from "../types";

/**
 * Contrato comum de origem de dados.
 * O pipeline de processamento não conhece a origem específica.
 */
export interface SourceAdapter {
  source: SourceKind;
  acquire(request: AcquisitionRequest): Promise<AcquisitionBatch>;
  describeCoverage(batch: AcquisitionBatch): CoverageInterval[];
  status(batch: AcquisitionBatch): AcquisitionBatch["status"];
}

export function resolveSourceFromFiles(fileNames: string[]): SourceKind {
  const lower = fileNames.map((n) => n.toLowerCase());
  if (lower.some((n) => n.endsWith(".zip"))) return "manual_zip";
  return "manual_xml";
}
