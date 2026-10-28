import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/cn";
import { useEsocial } from "../EsocialProvider";
import type { EventType } from "../types";

const FILTERS: Array<"Todos" | "S-2210" | "S-2220" | "S-2230" | "S-2240"> = [
  "Todos",
  "S-2210",
  "S-2220",
  "S-2230",
  "S-2240",
];

export function EsocialEventsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { getEvents } = useEsocial();
  const [tipo, setTipo] = useState<(typeof FILTERS)[number]>("Todos");
  const events = getEvents(id, tipo === "Todos" ? "Todos" : (tipo as EventType));
  const page = usePagination(events, `${tipo}|${events.length}`);

  const counts = useMemo(() => {
    const all = getEvents(id, "Todos");
    return {
      "S-2210": all.filter((e) => e.eventType === "S-2210").length,
      "S-2220": all.filter((e) => e.eventType === "S-2220").length,
      "S-2230": all.filter((e) => e.eventType === "S-2230").length,
      "S-2240": all.filter((e) => e.eventType === "S-2240").length,
    };
  }, [getEvents, id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTipo(f)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              tipo === f ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700",
            )}
          >
            {f}
            {f !== "Todos" ? ` (${counts[f]})` : ""}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-surface-0 shadow-card">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-surface-50 text-navy-900">
            <tr>
              <th className="px-4 py-3 font-semibold">Evento</th>
              <th className="px-4 py-3 font-semibold">Trabalhador / vínculo</th>
              <th className="px-4 py-3 font-semibold">Data do fato</th>
              <th className="px-4 py-3 font-semibold">Recepção</th>
              <th className="px-4 py-3 font-semibold">Situação</th>
              <th className="px-4 py-3 font-semibold">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {page.items.map((e) => (
              <tr key={e.id} className="hover:bg-surface-50">
                <td className="px-4 py-3 font-semibold text-navy-900">{e.eventType}</td>
                <td className="px-4 py-3">
                  <div>{e.workerName ?? "—"}</div>
                  <div className="text-ink-muted">
                    {e.matricula ? `Mat. ${e.matricula}` : ""} {e.cpfMasked ?? ""}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{e.eventDate ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">
                  {e.receivedAt.slice(0, 10)}
                </td>
                <td className="px-4 py-3">
                  {e.excluido ? "Excluído" : e.retificado ? "Retificado" : e.parseStatus}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/empresas/${id}/esocial/eventos/${e.id}`}
                    className="font-semibold text-blue-600"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <p className="px-4 py-10 text-center text-ink-muted">Nenhum evento neste filtro.</p>
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
        S-2220: contar 1 ASO + N exames na exportação — não confundir totais.
      </p>
    </div>
  );
}
