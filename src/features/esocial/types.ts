/** Domínio eSocial — modelo mínimo do plano v1.0 (24/10/2026). */

export type SourceKind = "manual_xml" | "manual_zip" | "soap";

export type BatchStatus =
  | "queued"
  | "retrieving"
  | "validating"
  | "parsing"
  | "reconciling"
  | "auditing"
  | "available"
  | "complete"
  | "partial"
  | "failed"
  | "interrupted";

export type PipelinePhase =
  | "enviando"
  | "validando"
  | "lendo_xmls"
  | "atualizando_vinculos"
  | "auditando"
  | "concluido";

export type CoverageQuality =
  | "suficiente"
  | "parcial"
  | "insuficiente"
  | "sem_permissao"
  | "nao_aplicavel";

export type CoberturaEsocial = "completa" | "parcial" | "sem_dados" | "desconhecida";
export type SituacaoExtracao =
  | "nunca_importado"
  | "processando"
  | "parcial"
  | "concluido"
  | "falhou";

export type ParseStatus =
  | "ok"
  | "reconhecido_nao_normalizado"
  | "invalido"
  | "duplicado"
  | "erro";

export type EventType =
  | "S-1000"
  | "S-1005"
  | "S-1010"
  | "S-1020"
  | "S-1200"
  | "S-2200"
  | "S-2205"
  | "S-2206"
  | "S-2210"
  | "S-2220"
  | "S-2221"
  | "S-2230"
  | "S-2240"
  | "S-2298"
  | "S-2299"
  | "S-2300"
  | "S-2306"
  | "S-2399"
  | "S-3000"
  | "S-5001"
  | "S-5011"
  | "DESCONHECIDO";

export type FindingStatus =
  | "confirmed_by_rule"
  | "needs_review"
  | "informational"
  | "insufficient_data";

export type FindingSeverity = "info" | "attention" | "high";

export interface AcquisitionBatch {
  id: string;
  companyId: string;
  source: SourceKind;
  status: BatchStatus;
  phase: PipelinePhase;
  requestedAt: string;
  completedAt?: string;
  fileNames: string[];
  totals: {
    arquivosRecebidos: number;
    eventosValidos: number;
    eventosDuplicados: number;
    eventosNaoReconhecidos: number;
    erros: number;
  };
  coverageLabel: string;
  errors: string[];
  partial: boolean;
}

export interface CoverageInterval {
  batchId: string;
  intervalStart: string;
  intervalEnd: string;
  intervalType: "entrega" | "competencia";
  status: CoverageQuality;
}

export interface RawEvent {
  id: string;
  companyId: string;
  batchId: string;
  eventType: EventType;
  eventId: string;
  receipt?: string;
  originalReceipt?: string;
  schemaVersion: string;
  eventDate?: string;
  competence?: string;
  receivedAt: string;
  workerName?: string;
  cpfMasked?: string;
  matricula?: string;
  parseStatus: ParseStatus;
  delayed?: boolean;
  retificado?: boolean;
  excluido?: boolean;
}

export interface WorkerSummary {
  id: string;
  companyId: string;
  nome: string;
  cpfMasked: string;
  matricula: string;
  cargoAtual: string;
  situacaoVinculo: "ativo" | "inativo";
  temS2220: boolean;
  temS2240: boolean;
  achadosCount: number;
}

export interface AuditFinding {
  id: string;
  companyId: string;
  auditRunId: string;
  employmentId?: string;
  workerId?: string;
  workerName?: string;
  ruleKey: string;
  ruleVersion: string;
  category: string;
  severity: FindingSeverity;
  title: string;
  explanation: string;
  affectedInterval?: string;
  status: FindingStatus;
  sourceEventIds: string[];
  confidenceAndLimits: string;
  detectedAt: string;
  relatedRuleKeys?: string[];
}

export interface EsocialSummary {
  companyId: string;
  ultimaImportacaoEm?: string;
  origem?: SourceKind;
  cobertura: CoberturaEsocial;
  processamento: SituacaoExtracao;
  analiseAtual: string;
  periodoAnalisado?: string;
  bannerParcial?: string;
  contagens: {
    trabalhadores: number;
    s2210: number;
    s2220: number;
    s2220Exames: number;
    s2230: number;
    s2240: number;
    achadosRevisao: number;
  };
}

export interface AcquisitionRequest {
  companyId: string;
  cnpj: string;
  source: SourceKind;
  files: { name: string; size: number }[];
}

export interface FinancialCalcStatus {
  component: string;
  status: "disponivel" | "indisponivel";
  amount?: number;
  reason?: string;
  formulaVersion?: string;
  legalBasis?: string;
}
