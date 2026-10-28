import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, FileDown } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAtualizacao, formatBRL } from "@/lib/format";

export function AnaliseDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { obterAnalise, obterEmpresa } = useApp();
  const navigate = useNavigate();
  const analise = id ? obterAnalise(id) : undefined;

  if (!analise) return <Navigate to="/analises" replace />;

  const empresa = obterEmpresa(analise.empresaId);
  const { data, hora } = formatAtualizacao(analise.atualizadoEm);

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-8">
      <button
        type="button"
        onClick={() => navigate("/analises")}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Voltar para análises
      </button>

      <div className="rounded-2xl bg-surface-0 p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] leading-10 font-extrabold text-navy-900">{analise.titulo}</h1>
            {empresa && (
              <Link
                to={`/empresas/${empresa.id}`}
                className="mt-2 inline-flex items-center gap-2 text-[15px] font-semibold text-blue-600 hover:text-blue-700"
              >
                <Building2 aria-hidden className="size-4" />
                {empresa.razaoSocial}
              </Link>
            )}
          </div>
          <StatusBadge status={analise.status} />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Info label="Passivo estimado" value={formatBRL(analise.passivoEstimado)} />
          <Info label="Progresso" value={`${analise.progresso}%`} />
          <Info label="Atualizado em" value={data} hint={hora} />
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ink-muted">Resumo</h2>
          <p className="mt-2 text-[15px] leading-6 text-navy-900">
            {analise.resumo ?? "Sem resumo disponível."}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            iconLeft={<FileDown aria-hidden className="size-5" />}
            onClick={() => navigate("/relatorios")}
            disabled={analise.status !== "completo"}
          >
            Gerar relatório
          </Button>
          {empresa && (
            <Button variant="ghost" onClick={() => navigate(`/empresas/${empresa.id}`)}>
              Abrir empresa
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-surface-50 p-4">
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-navy-900">{value}</p>
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}
