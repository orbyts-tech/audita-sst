import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, SearchX } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { usePagination } from "@/hooks/usePagination";
import { formatAtualizacao, formatCNPJ, normalizar } from "@/lib/format";
import { StatusSolicitacaoBadge } from "./StatusSolicitacaoBadge";

export function SolicitacoesPage() {
  const { solicitacoes, obterEmpresa } = useApp();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const termo = useDeferredValue(busca);

  const filtradas = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return solicitacoes;
    return solicitacoes.filter((s) => {
      const empresa = obterEmpresa(s.empresaId);
      return (
        normalizar(empresa?.razaoSocial ?? "").includes(t) ||
        (empresa && empresa.cnpj.includes(t.replace(/\D/g, "")))
      );
    });
  }, [solicitacoes, termo, obterEmpresa]);

  const { items, page, setPage, total, totalPages, from, to } = usePagination(
    filtradas,
    `${termo}|${solicitacoes.length}`,
  );

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 md:gap-8">
      <PageHeader
        title="Solicitações"
        description="Uma solicitação automática por empresa: o robô extrai o eSocial e gera o relatório."
        actions={
          <Button iconLeft={<Plus aria-hidden className="size-5" />} onClick={() => navigate("/solicitacoes/nova")}>
            Nova solicitação
          </Button>
        }
      />

      <SearchInput
        label="Buscar por empresa ou CNPJ"
        placeholder="Buscar por empresa ou CNPJ..."
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
            <h2 className="text-lg font-bold text-navy-900">Nenhuma solicitação</h2>
            <p className="max-w-sm text-sm text-ink-muted">
              Cadastre uma empresa e abra a primeira solicitação automática.
            </p>
            <Button onClick={() => navigate("/solicitacoes/nova")}>Nova solicitação</Button>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {items.map((s) => {
                const empresa = obterEmpresa(s.empresaId);
                const { data, hora } = formatAtualizacao(s.atualizadoEm);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/solicitacoes/${s.id}`)}
                      className="flex w-full flex-col gap-3 px-4 py-5 text-left transition-colors hover:bg-surface-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-bold text-navy-900">
                          {empresa?.razaoSocial ?? "Empresa removida"}
                        </div>
                        <div className="mt-1 truncate text-sm text-ink-muted">
                          {empresa ? formatCNPJ(empresa.cnpj) : "—"} · Automático
                          {s.relatorioParcial ? " · Relatório parcial" : ""}
                        </div>
                        <div className="mt-2 text-xs text-ink-muted">
                          Atualizado em {data} {hora}
                        </div>
                      </div>
                      <StatusSolicitacaoBadge status={s.status} />
                      <ChevronRight aria-hidden className="hidden size-5 text-ink-muted sm:block" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <Pagination
              className="border-t border-border px-4 py-4"
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
    </div>
  );
}
