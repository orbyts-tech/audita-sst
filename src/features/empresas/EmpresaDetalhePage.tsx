import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, Calculator } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { formatAtualizacao, formatCNPJ } from "@/lib/format";
import { GRUPO_ESOCIAL, TIPO_ACESSO_LABEL } from "@/features/solicitacoes/labels";
import { StatusSolicitacaoBadge } from "@/features/solicitacoes/StatusSolicitacaoBadge";

export function EmpresaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { obterEmpresa, obterSolicitacaoDaEmpresa, criarSolicitacao } = useApp();
  const navigate = useNavigate();
  const empresa = id ? obterEmpresa(id) : undefined;
  const sol = id ? obterSolicitacaoDaEmpresa(id) : undefined;

  if (!empresa) return <Navigate to="/empresas" replace />;

  const grupo = GRUPO_ESOCIAL.find((g) => g.value === empresa.grupoEsocial);
  const importacao = empresa.ultimaImportacaoEm
    ? formatAtualizacao(empresa.ultimaImportacaoEm)
    : null;

  function abrirOuCriarSolicitacao() {
    if (sol) {
      navigate(`/solicitacoes/${sol.id}`);
      return;
    }
    const result = criarSolicitacao(empresa!.id);
    if ("erro" in result) return;
    navigate(`/solicitacoes/${result.id}`);
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8">
      <button
        type="button"
        onClick={() => navigate("/empresas")}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Voltar para empresas
      </button>

      <div className="flex flex-wrap items-start justify-between gap-6 rounded-2xl bg-surface-0 p-6 shadow-card">
        <div className="flex min-w-0 items-center gap-5">
          <InitialsAvatar id={empresa.id} nome={empresa.razaoSocial} size={64} />
          <div className="min-w-0">
            <h1 className="text-[24px] leading-8 font-extrabold tracking-[-0.01em] text-navy-900 sm:truncate sm:text-[32px] sm:leading-10">
              {empresa.razaoSocial}
            </h1>
            <p className="mt-1 text-ink-muted">{empresa.segmento}</p>
            <p className="mt-2 text-[15px] tabular-nums text-navy-900">
              {formatCNPJ(empresa.cnpj)}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{empresa.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            iconLeft={<ClipboardList aria-hidden className="size-5" />}
            onClick={abrirOuCriarSolicitacao}
          >
            {sol ? "Abrir solicitação" : "Criar solicitação"}
          </Button>
          <Button
            variant="secondary"
            iconLeft={<Calculator aria-hidden className="size-5" />}
            onClick={() => navigate(`/empresas/${empresa.id}/sat-rat`)}
          >
            SAT/RAT
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Grupo eSocial"
          value={`Grupo ${empresa.grupoEsocial}`}
          hint={grupo ? `Desde ${grupo.desde}` : undefined}
        />
        <MetricCard label="Tipo de acesso" value={TIPO_ACESSO_LABEL[empresa.tipoAcesso]} />
        <MetricCard
          label="Última importação"
          value={importacao ? importacao.data : "—"}
          hint={importacao?.hora}
        />
        <div className="rounded-2xl bg-surface-0 p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-muted">Solicitação</p>
          <div className="mt-3">
            {sol ? (
              <StatusSolicitacaoBadge status={sol.status} />
            ) : (
              <span className="text-sm text-ink-muted">Nenhuma ainda</span>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-surface-0 p-6 shadow-card">
        <h2 className="text-lg font-bold text-navy-900">Próximo passo</h2>
        <p className="mt-2 text-[15px] text-ink-muted">
          {sol
            ? "Acompanhe a extração automática, atualize dados para novos meses e abra o relatório (parcial enquanto faltam períodos)."
            : "Crie a solicitação automática. O robô usa o certificado (próprio ou procuração em Meus dados) e busca o histórico conforme o grupo eSocial."}
        </p>
        {sol && (
          <Link
            to={`/solicitacoes/${sol.id}`}
            className="mt-4 inline-block font-semibold text-blue-600 hover:text-blue-700"
          >
            Ir para a solicitação →
          </Link>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-0 p-5 shadow-card">
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      <p className="mt-2 text-[15px] font-bold text-navy-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
