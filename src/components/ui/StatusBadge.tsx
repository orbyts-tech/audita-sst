import { cn } from "@/lib/cn";

export type StatusAnalise = "completo" | "em_analise" | "parcial" | "pendente";

const STATUS: Record<StatusAnalise, { label: string; badge: string; dot: string }> = {
  completo: { label: "Completo", badge: "bg-success-100 text-success-600", dot: "bg-success-600" },
  em_analise: { label: "Em análise", badge: "bg-warning-100 text-warning-600", dot: "bg-warning-600" },
  parcial: { label: "Parcial", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-600" },
  pendente: { label: "Pendente", badge: "bg-danger-100 text-danger-600", dot: "bg-danger-600" },
};

export function StatusBadge({ status, className }: { status: StatusAnalise; className?: string }) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        s.badge,
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
