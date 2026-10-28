import type { StatusSolicitacao } from "./types";

export const STATUS_SOLICITACAO_LABEL: Record<StatusSolicitacao, string> = {
  criado: "Criado",
  em_execucao: "Em execução",
  aguardando_liberacao: "Aguardando liberação",
  aguardando_extracao: "Aguardando extração",
  baixando: "Em execução (download)",
  encerrado: "Encerrado",
  com_erro: "Com erro",
  reiniciado: "Reiniciado",
  cancelado: "Cancelado",
};

export const STATUS_SOLICITACAO_HINT: Record<StatusSolicitacao, string> = {
  criado: "Solicitação registrada. O robô pega a tarefa em menos de 1 minuto.",
  em_execucao: "Robô no portal eSocial Download com o certificado.",
  aguardando_liberacao:
    "Períodos pedidos ao governo. Nova verificação a cada ~2 horas.",
  aguardando_extracao: "Pacote liberado; na fila para baixar.",
  baixando: "Baixando o ZIP, guardando no servidor e importando XMLs.",
  encerrado: "Extração concluída. Relatório disponível.",
  com_erro: "Falha na extração. Consulte o log.",
  reiniciado: "Solicitação reiniciada; o ciclo recomeça.",
  cancelado: "Solicitação cancelada.",
};

/** Grupo eSocial → desde quando buscar eventos. */
export const GRUPO_ESOCIAL = [
  { value: 1 as const, label: "Grupo 1", desde: "01/2018" },
  { value: 2 as const, label: "Grupo 2", desde: "07/2018" },
  { value: 3 as const, label: "Grupo 3", desde: "01/2019" },
  { value: 4 as const, label: "Grupo 4", desde: "07/2021" },
];

export type GrupoEsocial = (typeof GRUPO_ESOCIAL)[number]["value"];

export const TIPO_ACESSO_LABEL = {
  certificado_proprio: "Certificado próprio da empresa",
  procuracao: "Procuração (certificado do escritório)",
} as const;

export type TipoAcessoEsocial = keyof typeof TIPO_ACESSO_LABEL;
