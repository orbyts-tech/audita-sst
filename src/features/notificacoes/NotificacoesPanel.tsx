import { useNavigate } from "react-router-dom";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { formatAtualizacao } from "@/lib/format";
import { cn } from "@/lib/cn";
import { toSafeInternalHref } from "@/lib/security/safeHref";

export function NotificacoesPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { notificacoes, marcarNotificacaoLida, marcarTodasLidas } = useApp();
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Notificações"
      className="absolute top-14 right-0 z-30 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border bg-surface-0 shadow-card"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-bold text-navy-900">Notificações</h2>
        <Button variant="ghost" size="sm" onClick={marcarTodasLidas}>
          Marcar todas como lidas
        </Button>
      </div>
      <ul className="max-h-[420px] overflow-y-auto">
        {notificacoes.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-ink-muted">
            Nenhuma notificação.
          </li>
        ) : (
          notificacoes.map((n) => {
            const { data, hora } = formatAtualizacao(n.criadaEm);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-surface-50",
                    !n.lida && "bg-blue-100/40",
                  )}
                  onClick={() => {
                    marcarNotificacaoLida(n.id);
                    onClose();
                    const dest = toSafeInternalHref(n.href);
                    if (dest) navigate(dest);
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.lida && (
                      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-danger-600" />
                    )}
                    <div className={cn("min-w-0", n.lida && "pl-4")}>
                      <div className="text-sm font-semibold text-navy-900">{n.titulo}</div>
                      <div className="mt-0.5 text-sm text-ink-muted">{n.mensagem}</div>
                      <div className="mt-1 text-xs text-ink-muted">
                        {data} {hora}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
