import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEsocial } from "../EsocialProvider";
import { FINDING_STATUS_LABEL, SEVERITY_LABEL } from "../labels";
import { getRule } from "../rules/catalog";

export function EsocialFindingDetailPage() {
  const { id = "", findingId = "" } = useParams<{ id: string; findingId: string }>();
  const { getFinding } = useEsocial();
  const finding = getFinding(id, findingId);
  const rule = finding ? getRule(finding.ruleKey) : undefined;

  if (!finding) return <Navigate to={`/empresas/${id}/esocial/auditoria`} replace />;

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={`/empresas/${id}/esocial/auditoria`}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Auditoria
      </Link>

      <article className="rounded-2xl bg-surface-0 p-5 shadow-card">
        <h2 className="text-xl font-bold text-navy-900">{finding.title}</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {SEVERITY_LABEL[finding.severity]} · {FINDING_STATUS_LABEL[finding.status]}
          {rule?.eValideCode ? ` · E-Valide ${rule.eValideCode}` : ""} · regra {finding.ruleKey} v
          {finding.ruleVersion}
        </p>

        <Section title="O que identificamos">
          <p>{finding.explanation}</p>
        </Section>
        <Section title="Como foi detectado">
          <p>
            {rule?.nature ?? "Regra versionada"} · run {finding.auditRunId}
          </p>
        </Section>
        <Section title="Dados de origem">
          {finding.sourceEventIds.length === 0 ? (
            <p className="text-ink-muted">Sem evento fonte (possível lacuna de cobertura).</p>
          ) : (
            <ul className="list-disc pl-5">
              {finding.sourceEventIds.map((evId) => (
                <li key={evId}>
                  <Link
                    to={`/empresas/${id}/esocial/eventos/${evId}`}
                    className="font-semibold text-blue-600"
                  >
                    {evId}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="O que conferir">
          <p>
            Trabalhador/vínculo, período afetado
            {finding.affectedInterval ? ` (${finding.affectedInterval})` : ""} e XMLs/recibos
            relacionados.
          </p>
        </Section>
        <Section title="Limitações">
          <p>{finding.confidenceAndLimits}</p>
        </Section>
        <Section title="Status de revisão">
          <p className="font-semibold">{FINDING_STATUS_LABEL[finding.status]}</p>
          <p className="mt-1 text-sm text-ink-muted">
            Regra acionada não equivale automaticamente a multa. O eSocial aceitar o evento não
            comprova conformidade do conteúdo.
          </p>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 border-t border-border pt-4">
      <h3 className="text-sm font-bold text-navy-900">{title}</h3>
      <div className="mt-2 text-[15px] leading-6 text-navy-900">{children}</div>
    </section>
  );
}
