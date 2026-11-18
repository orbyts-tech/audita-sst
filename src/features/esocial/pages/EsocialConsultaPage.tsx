import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { CloudDownload, Loader2 } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { formatCNPJ } from "@/lib/format";
import {
  fetchCertificadoStatus,
  iniciarConsultaS1000,
  listarEventosEsocial,
  type CertificadoStatus,
  type ConsultaResult,
} from "@/lib/esocialApi";

export function EsocialConsultaPage() {
  const { id } = useParams<{ id: string }>();
  const { obterEmpresa, can } = useApp();
  const empresa = id ? obterEmpresa(id) : undefined;
  const podeConsultar = id ? can("operations.write", id) : false;

  const [cert, setCert] = useState<CertificadoStatus | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const [eventos, setEventos] = useState<ConsultaResult["eventos"]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !empresa) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchCertificadoStatus(id);
        if (!cancelled) setCert(status);
        const listed = await listarEventosEsocial(id, "S-1000");
        if (!cancelled) setEventos(listed.items);
      } catch (err) {
        if (!cancelled) {
          setCertError(err instanceof Error ? err.message : "Falha ao carregar status.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, empresa]);

  if (!empresa || !id) return <Navigate to="/empresas" replace />;

  async function onConsultar() {
    if (!podeConsultar) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const r = await iniciarConsultaS1000(id!);
      setResult(r);
      const listed = await listarEventosEsocial(id!, "S-1000");
      setEventos(listed.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na consulta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-surface-0 p-6 shadow-card">
        <h2 className="text-lg font-bold text-navy-900">Consultar eSocial</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Consulta S-1000 autorizada pela sua sessão Supabase e pelo vínculo com a empresa.
          Chamadas reais ao governo permanecem desabilitadas nesta etapa.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Empresa</dt>
            <dd className="font-semibold text-navy-900">{empresa.razaoSocial}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">CNPJ</dt>
            <dd className="font-semibold tabular-nums text-navy-900">{formatCNPJ(empresa.cnpj)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Evento</dt>
            <dd className="font-semibold text-navy-900">S-1000</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Ambiente</dt>
            <dd className="font-semibold text-navy-900">
              {cert?.ambiente ?? "—"}
              {cert?.transportMock ? (
                <span className="ml-2 rounded-md bg-warning-100 px-2 py-0.5 text-xs font-semibold text-warning-600">
                  transporte mock (não é governo)
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl bg-surface-0 p-6 shadow-card">
        <div>
          <h3 className="text-base font-bold text-navy-900">Certificado A1</h3>
          {certError && <p className="mt-2 text-sm text-danger-600">{certError}</p>}
          {cert && (
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              <li>
                Situação:{" "}
                <span className="font-semibold text-navy-900">
                  {cert.configured ? "Configurado no servidor" : "Não configurado"}
                </span>
              </li>
              {cert.subjectCN && <li>Titular: {cert.subjectCN}</li>}
              {cert.notAfter && (
                <li>Validade até: {new Date(cert.notAfter).toLocaleString("pt-BR")}</li>
              )}
              {cert.message && <li>{cert.message}</li>}
            </ul>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            iconLeft={
              loading ? (
                <Loader2 aria-hidden className="size-5 animate-spin" />
              ) : (
                <CloudDownload aria-hidden className="size-5" />
              )
            }
            disabled={loading || !podeConsultar}
            onClick={onConsultar}
          >
            {loading ? "Consultando…" : "Iniciar consulta S-1000"}
          </Button>
          {!podeConsultar && (
            <p className="text-sm text-ink-muted">Seu papel permite apenas leitura nesta empresa.</p>
          )}
        </div>
        {error && (
          <p className="mt-3 text-sm text-danger-600" role="alert">
            {error}
          </p>
        )}
      </section>

      {result && (
        <section className="rounded-2xl bg-surface-0 p-6 shadow-card">
          <h3 className="text-base font-bold text-navy-900">Resultado da consulta</h3>
          {result.transportMock && (
            <p
              role="status"
              className="mt-3 rounded-md border border-warning-200 bg-warning-100 px-4 py-3 text-sm text-warning-600"
            >
              Resultado gerado com transporte mock. Não é resposta oficial do eSocial.
            </p>
          )}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Status</dt>
              <dd className="font-semibold text-navy-900">{result.status}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Código retorno</dt>
              <dd className="font-semibold text-navy-900">{result.cdResposta ?? "—"}</dd>
            </div>
            {result.message && (
              <div className="sm:col-span-2">
                <dt className="text-ink-muted">Mensagem</dt>
                <dd className="font-semibold text-navy-900">{result.message}</dd>
              </div>
            )}
          </dl>

          {result.identificadores.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-bold text-navy-900">Identificadores</h4>
              <ul className="mt-2 space-y-2 text-sm">
                {result.identificadores.map((i) => (
                  <li key={i.id} className="rounded-md bg-surface-50 px-3 py-2">
                    <span className="font-mono text-navy-900">{i.id}</span>
                    {i.nrRec ? (
                      <span className="ml-2 text-ink-muted">Recibo {i.nrRec}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.eventos.map((ev) => (
            <div key={ev.id} className="mt-4 rounded-md border border-border p-4">
              <p className="text-sm font-bold text-navy-900">
                {ev.eventType} · {ev.eventId}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Recibo: {ev.nrRecibo ?? "—"} · Consulta:{" "}
                {new Date(ev.dataConsulta).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-ink-muted">SHA-256: {ev.xmlSha256}</p>
              {ev.payload && (
                <pre className="mt-3 overflow-x-auto rounded-md bg-surface-50 p-3 text-xs text-navy-900">
                  {JSON.stringify(ev.payload, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </section>
      )}

      {eventos.length > 0 && !result && (
        <section className="rounded-2xl bg-surface-0 p-6 shadow-card">
          <h3 className="text-base font-bold text-navy-900">Eventos S-1000 já persistidos</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {eventos.map((ev) => (
              <li key={ev.id} className="rounded-md bg-surface-50 px-3 py-2">
                {ev.eventId} · {ev.nrRecibo ?? "sem recibo"} ·{" "}
                {new Date(ev.dataConsulta).toLocaleString("pt-BR")}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
