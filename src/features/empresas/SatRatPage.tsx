import { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { useEsocial } from "@/features/esocial/EsocialProvider";
import { EsocialSatRatPage } from "@/features/esocial/pages/EsocialSatRatPage";
import { formatCNPJ } from "@/lib/format";

/** SAT/RAT opcional e separado do fluxo de solicitação/relatório. */
export function SatRatPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { obterEmpresa, obterSolicitacaoDaEmpresa } = useApp();
  const { ensureCompany } = useEsocial();
  const empresa = obterEmpresa(id);
  const sol = obterSolicitacaoDaEmpresa(id);

  useEffect(() => {
    if (id) ensureCompany(id);
  }, [id, ensureCompany]);

  if (!empresa) return <Navigate to="/empresas" replace />;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate(sol ? `/solicitacoes/${sol.id}` : `/empresas/${id}`)}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {sol ? "Voltar à solicitação" : "Voltar à empresa"}
      </button>

      <div>
        <h1 className="text-[24px] font-extrabold text-navy-900 md:text-[28px]">
          SAT/RAT — {empresa.razaoSocial}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {formatCNPJ(empresa.cnpj)} · Nomeie naturezas por CNAE, ligue CBOs e gere a planilha de
          lotação (opcional, separado do relatório SST).
        </p>
      </div>

      <EsocialSatRatPage />

      <p className="text-sm text-ink-muted">
        Fluxo completo de parametrização CNAE/CBO virá na próxima iteração.{" "}
        {sol && (
          <Link to={`/solicitacoes/${sol.id}/relatorio`} className="font-semibold text-blue-600">
            Ir ao relatório
          </Link>
        )}
      </p>
    </div>
  );
}
