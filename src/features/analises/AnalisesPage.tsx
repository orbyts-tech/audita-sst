import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, SearchX } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { usePagination } from "@/hooks/usePagination";
import { formatAtualizacao, formatBRL, normalizar } from "@/lib/format";

export function AnalisesPage() {
  const { analises, obterEmpresa } = useApp();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const termo = useDeferredValue(busca);

  const filtradas = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return analises;
    return analises.filter((a) => {
      const empresa = obterEmpresa(a.empresaId);
      return (
        normalizar(a.titulo).includes(t) ||
        (empresa && normalizar(empresa.razaoSocial).includes(t))
      );
    });
  }, [analises, termo, obterEmpresa]);

  const { items, page, setPage, total, totalPages, from, to } = usePagination(
    filtradas,
    `${termo}|${analises.length}`,
  );

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 md:gap-8">
      <PageHeader
        title="Análises"
        description="Acompanhe o andamento das auditorias de SST por empresa."
      />

      <SearchInput
        label="Buscar análise por título ou empresa"
        placeholder="Buscar por análise ou empresa..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="min-w-0 w-full max-w-xl"
      />

      <section className="overflow-hidden rounded-2xl bg-surface-0 shadow-card">
        {filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <SearchX aria-hidden className="size-7" />
            </span>
            <h2 className="text-lg font-bold text-navy-900">Nenhuma análise encontrada</h2>
            <Button variant="ghost" onClick={() => setBusca("")}>
              Limpar busca
            </Button>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {items.map((a) => {
                const empresa = obterEmpresa(a.empresaId);
                const { data, hora } = formatAtualizacao(a.atualizadoEm);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/analises/${a.id}`)}
                      className="flex w-full flex-col gap-3 px-4 py-5 text-left transition-colors hover:bg-surface-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-bold text-navy-900">{a.titulo}</div>
                        <div className="mt-1 truncate text-sm text-ink-muted">
                          {empresa?.razaoSocial ?? "Empresa removida"} · {formatBRL(a.passivoEstimado)}
                        </div>
                        <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-blue-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${a.progresso}%` }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-ink-muted">{a.progresso}% concluído</div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <StatusBadge status={a.status} />
                        <div className="text-right">
                          <div className="text-[15px] text-navy-900 tabular-nums">{data}</div>
                          <div className="text-[13px] text-ink-muted">{hora}</div>
                        </div>
                        <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-muted" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Pagination
              className="border-t border-border px-4 py-4 sm:px-5"
              page={page}
              totalPages={totalPages}
              total={total}
              from={from}
              to={to}
              onChange={setPage}
            />
          </>
        )}
      </section>
      <p className="sr-only" aria-live="polite">
        {`${filtradas.length} análises na lista, página ${page} de ${totalPages}`}
      </p>
    </div>
  );
}
