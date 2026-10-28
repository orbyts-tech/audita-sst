import type { Solicitacao, StatusSolicitacao } from "@/features/solicitacoes/types";

/** Pipeline do robô — domínio puro (SRP / testável sem React). */
export const PIPELINE_STATUS: StatusSolicitacao[] = [
  "criado",
  "em_execucao",
  "aguardando_liberacao",
  "aguardando_extracao",
  "baixando",
  "encerrado",
];

const TERMINAIS: StatusSolicitacao[] = ["encerrado", "com_erro", "cancelado"];

export function isStatusTerminal(status: StatusSolicitacao): boolean {
  return TERMINAIS.includes(status);
}

export function proximoStatusPipeline(atual: StatusSolicitacao): StatusSolicitacao | null {
  if (isStatusTerminal(atual)) return null;
  const base = atual === "reiniciado" ? "criado" : atual;
  const idx = PIPELINE_STATUS.indexOf(base);
  if (idx < 0) return "em_execucao";
  if (idx >= PIPELINE_STATUS.length - 1) return "encerrado";
  return PIPELINE_STATUS[idx + 1]!;
}

export function aplicarTickPipeline(
  sol: Solicitacao,
  agoraIso: string,
): Solicitacao | null {
  const nextStatus = proximoStatusPipeline(sol.status);
  if (!nextStatus) return null;

  const parcial = nextStatus !== "encerrado";
  return {
    ...sol,
    status: nextStatus,
    atualizadoEm: agoraIso,
    relatorioParcial: parcial,
    relatorioDisponivel: nextStatus !== "criado" && nextStatus !== "em_execucao",
    ultimaAtualizacaoDadosEm:
      nextStatus === "baixando" || nextStatus === "encerrado"
        ? agoraIso
        : sol.ultimaAtualizacaoDadosEm,
    periodos:
      nextStatus === "baixando" || nextStatus === "encerrado"
        ? sol.periodos.map((p, i) =>
            i === 0 || nextStatus === "encerrado"
              ? { ...p, status: "importado" as const }
              : p,
          )
        : sol.periodos,
  };
}
