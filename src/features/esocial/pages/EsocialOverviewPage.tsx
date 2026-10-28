import { Link, useParams } from "react-router-dom";
import { useEsocial } from "../EsocialProvider";
import { FINDING_STATUS_LABEL, SEVERITY_LABEL } from "../labels";
import { formatAtualizacao } from "@/lib/format";
import { getRule } from "../rules/catalog";

export function EsocialOverviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { getSummary, getFindings } = useEsocial();
  const summary = getSummary(id);
  const findings = getFindings(id)
    .filter((f) => f.status === "needs_review" || f.status === "insufficient_data")
    .slice(0, 5);

  if (!summary) {
    return (
      <div className="rounded-2xl bg-surface-0 p-8 text-center shadow-card">
        <p className="text-ink-muted">Nenhum dado eSocial ainda.</p>
        <Link
          to={`/empresas/${id}/esocial/importar`}
          className="mt-3 inline-block font-semibold text-blue-600"
        >
          Importar XML/ZIP
        </Link>
      </div>
    );
  }

  const c = summary.contagens;
  const ultima = summary.ultimaImportacaoEm
    ? formatAtualizacao(summary.ultimaImportacaoEm)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 rounded-2xl bg-surface-0 p-4 shadow-card sm:grid-cols-2 lg:grid-cols-5">
        <Meta
          label="Última importação"
          value={ultima ? `${ultima.data} ${ultima.hora}` : "—"}
        />
        <Meta label="Origem" value={summary.origem ?? "—"} />
        <Meta label="Cobertura" value={summary.cobertura} />
        <Meta label="Processamento" value={summary.processamento} />
        <Meta label="Análise atual" value={summary.analiseAtual} />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-2xl bg-surface-0 px-5 py-4 text-sm shadow-card">
        <Count label="Trabalhadores" value={c.trabalhadores} />
        <Count label="S-2210" value={c.s2210} />
        <Count label="S-2220" value={c.s2220} hint={`${c.s2220Exames} exames`} />
        <Count label="S-2230" value={c.s2230} />
        <Count label="S-2240" value={c.s2240} />
        <Count label="Achados p/ revisão" value={c.achadosRevisao} />
      </div>

      <section className="rounded-2xl bg-surface-0 p-5 shadow-card">
        <h2 className="text-lg font-bold text-navy-900">O que requer atenção</h2>
        {findings.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">Nenhum achado prioritário no momento.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {findings.map((f) => {
              const rule = getRule(f.ruleKey);
              return (
                <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      to={`/empresas/${id}/esocial/auditoria/${f.id}`}
                      className="font-semibold text-navy-900 hover:text-blue-600"
                    >
                      {f.title}
                    </Link>
                    <p className="mt-1 text-sm text-ink-muted">
                      {f.workerName ?? "Empresa"} · {SEVERITY_LABEL[f.severity]} ·{" "}
                      {FINDING_STATUS_LABEL[f.status]}
                      {rule?.eValideCode ? ` · E-Valide ${rule.eValideCode}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-surface-0 p-5 shadow-card">
        <h2 className="text-lg font-bold text-navy-900">Eventos e dados disponíveis</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <QuickLink to={`/empresas/${id}/esocial/trabalhadores`} label="Trabalhadores" />
          <QuickLink to={`/empresas/${id}/esocial/eventos`} label="Eventos SST" />
          <QuickLink to={`/empresas/${id}/esocial/auditoria`} label="Auditoria" />
          <QuickLink to={`/empresas/${id}/esocial/extracoes`} label="Extrações" />
          <QuickLink to={`/empresas/${id}/esocial/relatorios`} label="Exportações" />
        </div>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-navy-900 capitalize">{value}</p>
    </div>
  );
}

function Count({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <span className="text-navy-900">
      <strong className="tabular-nums">{value}</strong>{" "}
      <span className="text-ink-muted">{label}</span>
      {hint && <span className="text-ink-muted"> ({hint})</span>}
    </span>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-100"
    >
      {label}
    </Link>
  );
}
