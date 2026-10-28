import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEsocial } from "../EsocialProvider";

export function EsocialEventDetailPage() {
  const { id = "", eventId = "" } = useParams<{ id: string; eventId: string }>();
  const { getEvent } = useEsocial();
  const event = getEvent(id, eventId);

  if (!event) return <Navigate to={`/empresas/${id}/esocial/eventos`} replace />;

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={`/empresas/${id}/esocial/eventos`}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Eventos SST
      </Link>

      <div className="rounded-2xl bg-surface-0 p-5 shadow-card">
        <h2 className="text-xl font-bold text-navy-900">
          {event.eventType} · {event.eventId}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {event.workerName} · Mat. {event.matricula} · {event.cpfMasked}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Recibo" value={event.receipt ?? "—"} />
          <Field label="Recibo original" value={event.originalReceipt ?? "—"} />
          <Field label="Versão leiaute" value={event.schemaVersion} />
          <Field label="Parse" value={event.parseStatus} />
          <Field label="Data do fato" value={event.eventDate ?? "—"} />
          <Field label="Recepção" value={event.receivedAt} />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Section title="Dados estruturados">
            <p className="text-sm text-ink-muted">
              Seções específicas por tipo (CAT, ASO+exames, afastamento, ambiente/EPI) serão
              preenchidas pelos parsers. Estrutura pronta no domínio.
            </p>
          </Section>
          <Section title="Histórico / retificações">
            <p className="text-sm text-ink-muted">
              {event.retificado
                ? "Este evento retifica um recibo anterior."
                : "Sem retificação registrada neste mock."}
            </p>
          </Section>
          <Section title="XML original">
            <p className="text-sm text-ink-muted">
              Acesso via URL assinada auditada (API futura). Objeto preservado no lote{" "}
              <code className="text-navy-900">{event.batchId}</code>.
            </p>
          </Section>
          <Section title="Evidências da auditoria">
            <Link
              to={`/empresas/${id}/esocial/auditoria`}
              className="text-sm font-semibold text-blue-600"
            >
              Ver achados relacionados
            </Link>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-50 p-3">
      <p className="text-xs font-semibold text-ink-muted uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold break-all text-navy-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="font-bold text-navy-900">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}
