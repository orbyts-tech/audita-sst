import { useEffect } from "react";
import { Link, Navigate, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { formatCNPJ } from "@/lib/format";
import { useEsocial } from "../EsocialProvider";
import { COBERTURA_LABEL, EXTRACAO_LABEL } from "../labels";
import { cn } from "@/lib/cn";

const TABS = [
  { to: "visao-geral", label: "Visão geral" },
  { to: "trabalhadores", label: "Trabalhadores" },
  { to: "eventos", label: "Eventos SST" },
  { to: "auditoria", label: "Auditoria" },
  { to: "sat-rat", label: "SAT/RAT" },
  { to: "relatorios", label: "Relatórios" },
  { to: "extracoes", label: "Extrações" },
] as const;

export function EsocialHubLayout() {
  const { id } = useParams<{ id: string }>();
  const { obterEmpresa } = useApp();
  const { ensureCompany, getSummary } = useEsocial();
  const navigate = useNavigate();
  const empresa = id ? obterEmpresa(id) : undefined;

  useEffect(() => {
    if (id) ensureCompany(id);
  }, [id, ensureCompany]);

  if (!empresa || !id) return <Navigate to="/empresas" replace />;

  const summary = getSummary(id);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate("/empresas")}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Empresas
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-surface-0 p-5 shadow-card">
        <div className="flex min-w-0 items-center gap-4">
          <InitialsAvatar id={empresa.id} nome={empresa.razaoSocial} size={56} />
          <div className="min-w-0">
            <h1 className="text-[24px] leading-8 font-extrabold text-navy-900 md:text-[28px]">
              {empresa.razaoSocial}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {formatCNPJ(empresa.cnpj)}
              {summary?.periodoAnalisado ? ` · Período ${summary.periodoAnalisado}` : ""}
            </p>
            {summary && (
              <p className="mt-2 text-sm text-ink-muted">
                Cobertura: {COBERTURA_LABEL[summary.cobertura]} · Extração:{" "}
                {EXTRACAO_LABEL[summary.processamento]}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            iconLeft={<Upload aria-hidden className="size-5" />}
            onClick={() => navigate(`/empresas/${id}/esocial/importar`)}
          >
            Importar XML/ZIP
          </Button>
          <Button
            variant="secondary"
            disabled
            title="Webservices SOAP em fase posterior"
          >
            Consultar atualizações
          </Button>
        </div>
      </div>

      {summary?.bannerParcial && (
        <div
          role="status"
          className="rounded-md border border-warning-200 bg-warning-100 px-4 py-3 text-sm text-warning-600"
        >
          {summary.bannerParcial}
        </div>
      )}

      <nav
        aria-label="Dados do eSocial"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={`/empresas/${id}/esocial/${tab.to}`}
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-[10px] px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-600"
                  : "text-ink-muted hover:bg-surface-50 hover:text-navy-900",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />

      <p className="text-center text-xs text-ink-muted">
        Fluxo preparado sem conexão a API.{" "}
        <Link to={`/empresas/${id}`} className="font-semibold text-blue-600">
          Voltar ao resumo da empresa
        </Link>
      </p>
    </div>
  );
}
