import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { usePagination } from "@/hooks/usePagination";
import { formatAtualizacao, formatBRL } from "@/lib/format";

export function RelatoriosPage() {
  const { analises, obterEmpresa } = useApp();
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  const concluidas = useMemo(
    () => analises.filter((a) => a.status === "completo"),
    [analises],
  );

  const { items, page, setPage, total, totalPages, from, to } = usePagination(
    concluidas,
    concluidas.length,
  );

  function baixar(id: string, titulo: string) {
    setBaixandoId(id);
    const blob = new Blob(
      [`Relatório Audita SST\n\n${titulo}\nGerado em ${new Date().toLocaleString("pt-BR")}\n`],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titulo.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    window.setTimeout(() => setBaixandoId(null), 600);
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 md:gap-8">
      <PageHeader
        title="Relatórios"
        description="Baixe os relatórios das análises concluídas."
      />

      <section className="rounded-2xl bg-surface-0 p-3 shadow-card sm:p-4">
        {concluidas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <FileText aria-hidden className="size-7" />
            </span>
            <h2 className="text-lg font-bold text-navy-900">Nenhum relatório disponível</h2>
            <p className="max-w-md text-[15px] text-ink-muted">
              Relatórios ficam disponíveis quando a análise da empresa estiver completa.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {items.map((a) => {
                const empresa = obterEmpresa(a.empresaId);
                const { data } = formatAtualizacao(a.atualizadoEm);
                return (
                  <li
                    key={a.id}
                    className="flex flex-col gap-3 px-2 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-4"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-navy-900">{a.titulo}</div>
                      <div className="mt-1 text-sm text-ink-muted">
                        {empresa?.razaoSocial} · {formatBRL(a.passivoEstimado)} · {data}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={a.status} />
                      <Button
                        size="sm"
                        variant="secondary"
                        iconLeft={<Download aria-hidden className="size-4" />}
                        disabled={baixandoId === a.id}
                        onClick={() => baixar(a.id, a.titulo)}
                      >
                        {baixandoId === a.id ? "Baixando…" : "Baixar"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination
              className="border-t border-border pt-4"
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
