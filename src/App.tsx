import { useMemo, useState } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useApp } from "@/app/AppProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { ConfiguracoesPage } from "@/features/configuracoes/ConfiguracoesPage";
import { EsocialHubLayout } from "@/features/esocial/components/EsocialHubLayout";
import { EsocialAuditPage } from "@/features/esocial/pages/EsocialAuditPage";
import { EsocialEventDetailPage } from "@/features/esocial/pages/EsocialEventDetailPage";
import { EsocialEventsPage } from "@/features/esocial/pages/EsocialEventsPage";
import { EsocialExtractionsPage } from "@/features/esocial/pages/EsocialExtractionsPage";
import { EsocialFindingDetailPage } from "@/features/esocial/pages/EsocialFindingDetailPage";
import { EsocialImportPage } from "@/features/esocial/pages/EsocialImportPage";
import { EsocialOverviewPage } from "@/features/esocial/pages/EsocialOverviewPage";
import { EsocialReportsPage } from "@/features/esocial/pages/EsocialReportsPage";
import { EsocialWorkersPage } from "@/features/esocial/pages/EsocialWorkersPage";
import { EmpresaDetalhePage } from "@/features/empresas/EmpresaDetalhePage";
import { EmpresasPage } from "@/features/empresas/EmpresasPage";
import { FiltrosEmpresasDrawer } from "@/features/empresas/FiltrosEmpresasDrawer";
import {
  aplicarFiltros,
  contarFiltrosAtivos,
  FILTROS_VAZIOS,
  type FiltrosEmpresas,
} from "@/features/empresas/filtros";
import { NovaEmpresaPage } from "@/features/empresas/NovaEmpresaPage";
import { SatRatPage } from "@/features/empresas/SatRatPage";
import { MeusDadosPage } from "@/features/meus-dados/MeusDadosPage";
import { NovaSolicitacaoPage } from "@/features/solicitacoes/NovaSolicitacaoPage";
import { RelatorioSolicitacaoPage } from "@/features/solicitacoes/RelatorioSolicitacaoPage";
import { SolicitacaoDetalhePage } from "@/features/solicitacoes/SolicitacaoDetalhePage";
import { SolicitacoesPage } from "@/features/solicitacoes/SolicitacoesPage";

function RequireAuth() {
  const { autenticado } = useApp();
  const location = useLocation();
  if (!autenticado) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

function AuthenticatedShell() {
  const { pathname } = useLocation();
  return (
    <AppLayout currentPath={pathname}>
      <Outlet />
    </AppLayout>
  );
}

function RedirectSatRat() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/empresas/${id}/sat-rat`} replace />;
}

function EmpresasRoute() {
  const { empresas } = useApp();
  const navigate = useNavigate();
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [filtrosDraft, setFiltrosDraft] = useState<FiltrosEmpresas>(FILTROS_VAZIOS);
  const [filtros, setFiltros] = useState<FiltrosEmpresas>(FILTROS_VAZIOS);

  const filtradas = useMemo(() => aplicarFiltros(empresas, filtros), [empresas, filtros]);
  const ativos = contarFiltrosAtivos(filtros);

  return (
    <>
      <EmpresasPage
        empresas={filtradas}
        filtrosAtivos={ativos}
        onNovaEmpresa={() => navigate("/empresas/nova")}
        onAbrirFiltros={() => {
          setFiltrosDraft(filtros);
          setFiltrosOpen(true);
        }}
        onAbrirEmpresa={(e) => navigate(`/empresas/${e.id}`)}
      />
      <FiltrosEmpresasDrawer
        open={filtrosOpen}
        value={filtrosDraft}
        onChange={setFiltrosDraft}
        onClose={() => setFiltrosOpen(false)}
        onAplicar={() => setFiltros(filtrosDraft)}
      />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AuthenticatedShell />}>
          <Route path="/" element={<Navigate to="/solicitacoes" replace />} />
          <Route path="/solicitacoes" element={<SolicitacoesPage />} />
          <Route path="/solicitacoes/nova" element={<NovaSolicitacaoPage />} />
          <Route path="/solicitacoes/:id" element={<SolicitacaoDetalhePage />} />
          <Route path="/solicitacoes/:id/relatorio" element={<RelatorioSolicitacaoPage />} />
          <Route path="/empresas" element={<EmpresasRoute />} />
          <Route path="/empresas/nova" element={<NovaEmpresaPage />} />
          <Route path="/empresas/:id" element={<EmpresaDetalhePage />} />
          <Route path="/empresas/:id/sat-rat" element={<SatRatPage />} />
          <Route path="/empresas/:id/esocial" element={<EsocialHubLayout />}>
            <Route index element={<Navigate to="visao-geral" replace />} />
            <Route path="visao-geral" element={<EsocialOverviewPage />} />
            <Route path="importar" element={<EsocialImportPage />} />
            <Route path="trabalhadores" element={<EsocialWorkersPage />} />
            <Route path="eventos" element={<EsocialEventsPage />} />
            <Route path="eventos/:eventId" element={<EsocialEventDetailPage />} />
            <Route path="auditoria" element={<EsocialAuditPage />} />
            <Route path="auditoria/:findingId" element={<EsocialFindingDetailPage />} />
            <Route path="sat-rat" element={<RedirectSatRat />} />
            <Route path="relatorios" element={<EsocialReportsPage />} />
            <Route path="extracoes" element={<EsocialExtractionsPage />} />
          </Route>
          <Route path="/meus-dados" element={<MeusDadosPage />} />
          <Route path="/analises" element={<Navigate to="/solicitacoes" replace />} />
          <Route path="/analises/:id" element={<Navigate to="/solicitacoes" replace />} />
          <Route path="/relatorios" element={<Navigate to="/solicitacoes" replace />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/solicitacoes" replace />} />
    </Routes>
  );
}
