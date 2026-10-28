import { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { ReportViewer } from "@/features/esocial/pages/EsocialReportsPage";
import { useEsocial } from "@/features/esocial/EsocialProvider";
import { formatCNPJ } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export function RelatorioSolicitacaoPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { obterSolicitacao, obterEmpresa, gerarRelatorioAgora } = useApp();
  const { ensureCompany } = useEsocial();
  const sol = obterSolicitacao(id);
  const empresa = sol ? obterEmpresa(sol.empresaId) : undefined;

  useEffect(() => {
    if (sol) ensureCompany(sol.empresaId);
  }, [sol, ensureCompany]);

  if (!sol || !empresa) return <Navigate to="/solicitacoes" replace />;
  if (!sol.relatorioDisponivel) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 py-12">
        <p className="text-navy-900">
          O relatório ainda não está disponível nesta etapa da extração.
        </p>
        <Button
          onClick={() => {
            gerarRelatorioAgora(sol.id);
          }}
        >
          Gerar relatório agora
        </Button>
        <Link to={`/solicitacoes/${sol.id}`} className="font-semibold text-blue-600">
          Voltar à solicitação
        </Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 flex h-[calc(100dvh-5.5rem)] w-[calc(100%+2rem)] max-w-none flex-col gap-2 sm:-mx-6 sm:w-[calc(100%+3rem)] md:-mx-8 md:h-[calc(100dvh-6.5rem)] md:w-[calc(100%+4rem)]">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-6 md:px-8">
        <button
          type="button"
          onClick={() => navigate(`/solicitacoes/${sol.id}`)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Solicitação
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold text-navy-900 md:text-xl">
            Relatório — {empresa.razaoSocial}
            {sol.relatorioParcial ? (
              <span className="ml-2 text-sm font-semibold text-warning-600">Parcial</span>
            ) : null}
          </h1>
          <p className="truncate text-xs text-ink-muted">
            {formatCNPJ(empresa.cnpj)} · Solicitações → Relatório
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-6 md:px-8">
        <ReportViewer companyId={empresa.id} parcial={sol.relatorioParcial} compact />
      </div>
    </div>
  );
}
