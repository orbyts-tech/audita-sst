import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { formatAtualizacao } from "@/lib/format";
import { useEsocial } from "../EsocialProvider";
import { BATCH_STATUS_LABEL } from "../labels";
import { PIPELINE_PHASE_LABELS } from "../pipeline/simulateImport";

export function EsocialExtractionsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { getBatches } = useEsocial();
  const batches = getBatches(id);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-navy-900">Extrações / lotes</h2>
        <Button onClick={() => navigate(`/empresas/${id}/esocial/importar`)}>
          Nova importação
        </Button>
      </div>

      {batches.length === 0 ? (
        <div className="rounded-2xl bg-surface-0 px-6 py-16 text-center shadow-card">
          <p className="font-bold text-navy-900">Nenhuma extração ainda</p>
          <p className="mt-2 text-sm text-ink-muted">
            Importe um ZIP/XML oficial obtido legalmente no portal do eSocial.
          </p>
          <Link
            to={`/empresas/${id}/esocial/importar`}
            className="mt-4 inline-block font-semibold text-blue-600"
          >
            Importar XML/ZIP
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface-0 shadow-card">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-surface-50 text-navy-900">
              <tr>
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Origem</th>
                <th className="px-4 py-3 font-semibold">Arquivos</th>
                <th className="px-4 py-3 font-semibold">Eventos</th>
                <th className="px-4 py-3 font-semibold">Cobertura</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batches.map((b) => {
                const { data, hora } = formatAtualizacao(b.requestedAt);
                return (
                  <tr key={b.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3">
                      <div className="tabular-nums">{data}</div>
                      <div className="text-ink-muted">{hora}</div>
                    </td>
                    <td className="px-4 py-3">{b.source}</td>
                    <td className="px-4 py-3">
                      {b.totals.arquivosRecebidos}
                      <div className="max-w-[180px] truncate text-xs text-ink-muted">
                        {b.fileNames.join(", ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {b.totals.eventosValidos} válidos
                      <div className="text-xs text-ink-muted">
                        {b.totals.eventosDuplicados} dup. · {b.totals.eventosNaoReconhecidos} n/rec.
                        · {b.totals.erros} erros
                      </div>
                    </td>
                    <td className="px-4 py-3">{b.coverageLabel}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{BATCH_STATUS_LABEL[b.status]}</div>
                      <div className="text-xs text-ink-muted">
                        {PIPELINE_PHASE_LABELS[b.phase]}
                        {b.partial ? " · parcial" : ""}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
