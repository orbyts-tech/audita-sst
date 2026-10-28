/** Linha do consolidado (paridade Valor Log / E-Valide), pronta para grade e Excel. */
export type EventPresence = "nao_localizado" | number;

export interface ConsolidadoRow {
  id: string;
  companyId: string;
  categoria: string;
  admissao: string;
  demissao?: string;
  matricula: string;
  cnpj: string;
  cpfMasked: string;
  cbo: string;
  cargo: string;
  nome: string;
  s2210: EventPresence;
  s2220: EventPresence;
  s2240: EventPresence;
  treinamento: EventPresence;
  inconsistencias: number;
  enviosForaPrazo: number | null;
  observacao?: string;
  /** Vínculos do mesmo CPF (ex.: mudanças de cargo) agrupáveis na UI. */
  cpfGroupKey: string;
}
