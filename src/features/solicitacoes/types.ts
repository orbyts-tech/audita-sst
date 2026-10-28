/** Status do robô de extração (paridade E-Valide). */
export type StatusSolicitacao =
  | "criado"
  | "em_execucao"
  | "aguardando_liberacao"
  | "aguardando_extracao"
  | "baixando"
  | "encerrado"
  | "com_erro"
  | "reiniciado"
  | "cancelado";

export type ModoSolicitacao = "automatico";

export interface PeriodoExtracao {
  id: string;
  competencia: string;
  status: "pendente" | "liberado" | "importado" | "erro";
}

export interface Solicitacao {
  id: string;
  empresaId: string;
  /** Uma solicitação automática por empresa — acumula histórico. */
  modo: ModoSolicitacao;
  status: StatusSolicitacao;
  /** Se informado, a busca começa nesta competência (AAAA-MM). */
  aPartirDe?: string;
  criadoEm: string;
  atualizadoEm: string;
  /** Relatório parcial enquanto faltam períodos. */
  relatorioParcial: boolean;
  relatorioDisponivel: boolean;
  logErro?: string;
  periodos: PeriodoExtracao[];
  /** Última vez que “Atualizar dados” ou geração rodou. */
  ultimaAtualizacaoDadosEm?: string;
}
