import { ESOCIAL_CONFIG } from "../config";
import type { FindingSeverity, FindingStatus } from "../types";

export interface AuditRuleDefinition {
  key: string;
  eValideCode?: string;
  title: string;
  category: string;
  defaultSeverity: FindingSeverity;
  defaultStatus: FindingStatus;
  explanation: string;
  nature: string;
}

/** Catálogo versionado — regras de paridade Valor Log + alto valor. */
export const AUDIT_RULES: AuditRuleDefinition[] = [
  {
    key: "missing_department_s2200",
    eValideCode: "2",
    title: "Setor/departamento não informado no S-2200",
    category: "qualidade_dados",
    defaultSeverity: "info",
    defaultStatus: "informational",
    explanation: "Campo opcional ausente no S-2200. Não constitui infração automática.",
    nature: "Qualidade de dados — não infração",
  },
  {
    key: "s2240_gap",
    eValideCode: "23",
    title: "Lacuna de S-2240 com data/condição esperada",
    category: "sst_exposicao",
    defaultSeverity: "attention",
    defaultStatus: "needs_review",
    explanation: "Indício de lacuna em S-2240; depende de cobertura e obrigação do vínculo.",
    nature: "Indício, depende de cobertura/obrigação",
  },
  {
    key: "missing_s2220",
    eValideCode: "33",
    title: "Sem S-2220 localizado",
    category: "sst_aso",
    defaultSeverity: "attention",
    defaultStatus: "needs_review",
    explanation: "Nenhum S-2220 encontrado para o vínculo no período coberto.",
    nature: "Indício, depende de vínculo e regras",
  },
  {
    key: "missing_s2240",
    eValideCode: "34",
    title: "Sem S-2240 localizado",
    category: "sst_exposicao",
    defaultSeverity: "attention",
    defaultStatus: "needs_review",
    explanation: "Nenhum S-2240 encontrado. Se a extração for parcial, marcar dados insuficientes.",
    nature: "Indício, depende de vínculo e regras",
  },
  {
    key: "missing_s2220_admissional",
    eValideCode: "35",
    title: "Sem S-2220 admissional localizado",
    category: "sst_aso",
    defaultSeverity: "attention",
    defaultStatus: "needs_review",
    explanation: "ASO admissional não localizado; depende da obrigatoriedade aplicável.",
    nature: "Indício, depende de obrigatoriedade",
  },
  {
    key: "s2240_start_vs_admission",
    eValideCode: "38",
    title: "Data inicial do S-2240 divergente da admissão",
    category: "sst_exposicao",
    defaultSeverity: "attention",
    defaultStatus: "needs_review",
    explanation: "Possível efeito no PPP. Requer enquadramento e revisão humana.",
    nature: "Indício, necessita enquadramento",
  },
  {
    key: "event_after_deadline",
    title: "Evento recebido após prazo aplicável",
    category: "prazos",
    defaultSeverity: "attention",
    defaultStatus: "needs_review",
    explanation: "Recebimento fora do prazo da época/categoria, com memória de cálculo a validar.",
    nature: "Indício com cálculo de prazo versionado",
  },
  {
    key: "insufficient_extraction",
    title: "Histórico de extração incompleto",
    category: "cobertura",
    defaultSeverity: "info",
    defaultStatus: "insufficient_data",
    explanation:
      "A ausência aparente de eventos não gera infração automática quando a cobertura é parcial.",
    nature: "Limitação de evidência",
  },
];

export function getRule(key: string) {
  return AUDIT_RULES.find((r) => r.key === key);
}

export function ruleSetVersion() {
  return ESOCIAL_CONFIG.regras.ruleSetVersion;
}
