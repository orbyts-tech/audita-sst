import type {
  BatchStatus,
  CoberturaEsocial,
  FindingSeverity,
  FindingStatus,
  SituacaoExtracao,
} from "./types";

export const COBERTURA_LABEL: Record<CoberturaEsocial, string> = {
  completa: "Completa",
  parcial: "Parcial",
  sem_dados: "Sem dados",
  desconhecida: "Desconhecida",
};

export const EXTRACAO_LABEL: Record<SituacaoExtracao, string> = {
  nunca_importado: "Nunca importado",
  processando: "Processando",
  parcial: "Parcial",
  concluido: "Concluído",
  falhou: "Falhou",
};

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  queued: "Na fila",
  retrieving: "Obtendo",
  validating: "Validando",
  parsing: "Lendo XMLs",
  reconciling: "Reconciliando",
  auditing: "Auditando",
  available: "Disponível",
  complete: "Concluído",
  partial: "Parcial",
  failed: "Falhou",
  interrupted: "Interrompido",
};

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  confirmed_by_rule: "Inconsistência identificada",
  needs_review: "Atenção / revisar",
  informational: "Informativo",
  insufficient_data: "Dados insuficientes",
};

export const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  info: "Info",
  attention: "Atenção",
  high: "Alta",
};
