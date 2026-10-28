import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Pagination({
  page,
  totalPages,
  total,
  from,
  to,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const paginas = numerosVisiveis(page, totalPages);

  return (
    <nav
      aria-label="Paginação"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-ink-muted">
        Mostrando{" "}
        <span className="font-semibold tabular-nums text-navy-900">
          {from}–{to}
        </span>{" "}
        de <span className="font-semibold tabular-nums text-navy-900">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <PageButton
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </PageButton>

        {paginas.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-2 text-ink-muted" aria-hidden>
              …
            </span>
          ) : (
            <PageButton
              key={p}
              aria-label={`Página ${p}`}
              aria-current={p === page ? "page" : undefined}
              active={p === page}
              onClick={() => onChange(p)}
            >
              {p}
            </PageButton>
          ),
        )}

        <PageButton
          aria-label="Próxima página"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight aria-hidden className="size-4" />
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
  ...aria
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md text-sm font-semibold transition-colors",
        active
          ? "bg-blue-600 text-white"
          : "bg-surface-0 text-navy-900 hover:bg-blue-100",
        "border border-border disabled:cursor-not-allowed disabled:opacity-40",
      )}
      {...aria}
    >
      {children}
    </button>
  );
}

function numerosVisiveis(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const ordered = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const n = ordered[i]!;
    if (i > 0 && n - ordered[i - 1]! > 1) out.push("…");
    out.push(n);
  }
  return out;
}
