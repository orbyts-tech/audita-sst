import { cn } from "@/lib/cn";
import type { StatusSolicitacao } from "./types";
import { STATUS_SOLICITACAO_LABEL } from "./labels";

const STYLE: Record<StatusSolicitacao, { badge: string; dot: string }> = {
  criado: { badge: "bg-surface-50 text-ink-muted", dot: "bg-ink-muted" },
  em_execucao: { badge: "bg-warning-100 text-warning-600", dot: "bg-warning-600" },
  aguardando_liberacao: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-600" },
  aguardando_extracao: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-600" },
  baixando: { badge: "bg-warning-100 text-warning-600", dot: "bg-warning-600" },
  encerrado: { badge: "bg-success-100 text-success-600", dot: "bg-success-600" },
  com_erro: { badge: "bg-danger-100 text-danger-600", dot: "bg-danger-600" },
  reiniciado: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-600" },
  cancelado: { badge: "bg-surface-50 text-ink-muted", dot: "bg-ink-muted" },
};

export function StatusSolicitacaoBadge({
  status,
  className,
}: {
  status: StatusSolicitacao;
  className?: string;
}) {
  const s = STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        s.badge,
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", s.dot)} />
      {STATUS_SOLICITACAO_LABEL[status]}
    </span>
  );
}
