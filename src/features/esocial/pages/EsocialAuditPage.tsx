import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/cn";
import { useEsocial } from "../EsocialProvider";
import { FINDING_STATUS_LABEL, SEVERITY_LABEL } from "../labels";
import { getRule } from "../rules/catalog";
import type { FindingStatus } from "../types";

export function EsocialAuditPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { getFindings } = useEsocial();
  const [status, setStatus] = useState<FindingStatus | "todos">("todos");
  const findings = getFindings(id);

  const filtrados = useMemo(
    () => (status === "todos" ? findings : findings.filter((f) => f.status === status)),
    [findings, status],
  );

  const page = usePagination(filtrados, `${status}|${findings.length}`);

  /** Agrupa regras relacionadas visualmente sem perder contagem bruta. */
  const grupos = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof filtrados = [];
    for (const f of page.items) {
      if (seen.has(f.id)) continue;
      out.push(f);
      for (const related of f.relatedRuleKeys ?? []) {
        const sibling = filtrados.find((x) => x.ruleKey === related && x.workerId === f.workerId);
        if (sibling) seen.add(sibling.id);
      }
    }
    return out;
  }, [page.items, filtrados]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["todos", "Todos"],
            ["needs_review", "Atenção / revisar"],
            ["informational", "Informativo"],
            ["insufficient_data", "Dados insuficientes"],
            ["confirmed_by_rule", "Inconsistência"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              status === value ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-sm text-ink-muted">
        Contagem bruta: {filtrados.length} achados. Lista agrupa evidências relacionadas do mesmo
        vínculo sem multiplicar infrações na leitura.
      </p>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface-0 shadow-card">
        {grupos.map((f) => {
          const rule = getRule(f.ruleKey);
          return (
            <li key={f.id}>
              <Link
                to={`/empresas/${id}/esocial/auditoria/${f.id}`}
                className="block px-4 py-4 transition-colors hover:bg-surface-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-navy-900">{f.title}</div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {f.workerName ?? "Escopo empresa"} · {SEVERITY_LABEL[f.severity]} ·{" "}
                      {FINDING_STATUS_LABEL[f.status]}
                      {rule?.eValideCode ? ` · E-Valide ${rule.eValideCode}` : ""}
                    </p>
                    {f.relatedRuleKeys && f.relatedRuleKeys.length > 0 && (
                      <p className="mt-1 text-xs text-ink-muted">
                        Relacionado: {f.relatedRuleKeys.join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-surface-50 px-3 py-1 text-xs font-semibold text-navy-900">
                    {f.category}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
        {grupos.length === 0 && (
          <li className="px-4 py-10 text-center text-ink-muted">Nenhum achado neste filtro.</li>
        )}
      </ul>

      <Pagination
        page={page.page}
        totalPages={page.totalPages}
        total={page.total}
        from={page.from}
        to={page.to}
        onChange={page.setPage}
      />
    </div>
  );
}
