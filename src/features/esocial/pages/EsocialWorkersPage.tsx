import { useDeferredValue, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { normalizar } from "@/lib/format";
import { useEsocial } from "../EsocialProvider";

export function EsocialWorkersPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { getWorkers } = useEsocial();
  const [busca, setBusca] = useState("");
  const termo = useDeferredValue(busca);
  const workers = getWorkers(id);

  const filtrados = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return workers;
    return workers.filter(
      (w) =>
        normalizar(w.nome).includes(t) ||
        normalizar(w.matricula).includes(t) ||
        w.cpfMasked.includes(t.replace(/\D/g, "")),
    );
  }, [workers, termo]);

  const page = usePagination(filtrados, `${termo}|${workers.length}`);

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        label="Buscar trabalhador"
        placeholder="Nome, CPF mascarado ou matrícula..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-xl"
      />

      <div className="overflow-x-auto rounded-2xl bg-surface-0 shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-50 text-navy-900">
            <tr>
              <th className="px-4 py-3 font-semibold">Trabalhador</th>
              <th className="px-4 py-3 font-semibold">Matrícula</th>
              <th className="px-4 py-3 font-semibold">Cargo atual</th>
              <th className="px-4 py-3 font-semibold">Vínculo</th>
              <th className="px-4 py-3 font-semibold">S-2220</th>
              <th className="px-4 py-3 font-semibold">S-2240</th>
              <th className="px-4 py-3 font-semibold">Achados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {page.items.map((w) => (
              <tr key={w.id} className="hover:bg-surface-50">
                <td className="px-4 py-3">
                  <div className="font-semibold text-navy-900">{w.nome}</div>
                  <div className="text-ink-muted">{w.cpfMasked}</div>
                </td>
                <td className="px-4 py-3 tabular-nums">{w.matricula}</td>
                <td className="px-4 py-3">{w.cargoAtual}</td>
                <td className="px-4 py-3 capitalize">{w.situacaoVinculo}</td>
                <td className="px-4 py-3">{w.temS2220 ? "Sim" : "Não"}</td>
                <td className="px-4 py-3">{w.temS2240 ? "Sim" : "Não"}</td>
                <td className="px-4 py-3">
                  {w.achadosCount > 0 ? (
                    <Link
                      to={`/empresas/${id}/esocial/auditoria`}
                      className="font-semibold text-blue-600"
                    >
                      {w.achadosCount}
                    </Link>
                  ) : (
                    "0"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <p className="px-4 py-10 text-center text-ink-muted">Nenhum trabalhador encontrado.</p>
        )}
        <Pagination
          className="border-t border-border px-4 py-4"
          page={page.page}
          totalPages={page.totalPages}
          total={page.total}
          from={page.from}
          to={page.to}
          onChange={page.setPage}
        />
      </div>
      <p className="text-xs text-ink-muted">
        CPF mascarado nas listas. Exportação completa fica em Relatórios.
      </p>
    </div>
  );
}
