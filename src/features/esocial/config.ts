/**
 * Limites e políticas do eSocial — centralizados.
 * Não espalhar números mágicos no restante do código.
 * Valores alinhados ao Manual do Desenvolvedor v1.16; portal WEB: validar no ambiente real.
 */
export const ESOCIAL_CONFIG = {
  importacao: {
    maxArquivoBytes: 50 * 1024 * 1024,
    maxArquivosPorLote: 50,
    extensoesPermitidas: [".xml", ".zip"] as const,
  },
  soap: {
    /** Acessos/dia por empregador (consulta IDs + download). Manual v1.16. */
    maxAcessosPorDiaPorEmpregador: 10,
    /** Sem chamadas nos dias 1–7 do mês (manual). */
    diasDoMesBloqueados: [1, 2, 3, 4, 5, 6, 7] as const,
    paralelismoPorEmpregador: false,
  },
  portalDownload: {
    /**
     * Não fixar regra de solicitação até validar no ambiente real
     * (há divergência documental: 185/36 vs 31/100).
     */
    regraSolicitacao: "nao_fixada" as const,
  },
  regras: {
    ruleSetVersion: "2026.10.1",
    projectionVersion: "1.0.0",
  },
} as const;
