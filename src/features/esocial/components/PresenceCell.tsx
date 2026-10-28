import { cn } from "@/lib/cn";
import type { EventPresence } from "../types/report";

/** Substitui o “NÃO TEM” do E-Valide por linguagem clara. */
export function PresenceCell({ value, label }: { value: EventPresence; label: string }) {
  if (value === "nao_localizado") {
    return (
      <span
        title={`${label}: nenhum evento localizado no período coberto da extração`}
        className="inline-flex rounded-full bg-surface-50 px-2.5 py-1 text-xs font-semibold text-ink-muted"
      >
        Não localizado
      </span>
    );
  }
  return (
    <span
      title={`${label}: ${value} registro(s)`}
      className={cn(
        "inline-flex min-w-7 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
        "bg-blue-100 text-blue-700",
      )}
    >
      {value}
    </span>
  );
}
