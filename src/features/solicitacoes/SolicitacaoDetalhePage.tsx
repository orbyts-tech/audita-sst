import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileSpreadsheet,
  RefreshCw,
  RotateCcw,
  Ban,
  Calculator,
} from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { formatAtualizacao, formatCNPJ } from "@/lib/format";
import { GRUPO_ESOCIAL, STATUS_SOLICITACAO_HINT, TIPO_ACESSO_LABEL } from "./labels";
import { StatusSolicitacaoBadge } from "./StatusSolicitacaoBadge";

export function SolicitacaoDetalhePage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    obterSolicitacao,
    obterEmpresa,
    atualizarDados,
    gerarRelatorioAgora,
    cancelarSolicitacao,
    reiniciarSolicitacao,
  } = useApp();

  const sol = obterSolicitacao(id);
  const empresa = sol ? obterEmpresa(sol.empresaId) : undefined;

  if (!sol || !empresa) return <Navigate to="/solicitacoes" replace />;

  const criado = formatAtualizacao(sol.criadoEm);
  const atualizado = formatAtualizacao(sol.atualizadoEm);
  const grupo = GRUPO_ESOCIAL.find((g) => g.value === empresa.grupoEsocial);
  const emCurso = !["encerrado", "com_erro", "cancelado"].includes(sol.status);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate("/solicitacoes")}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Solicitações
      </button>

      <div className="rounded-2xl bg-surface-0 p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[24px] leading-8 font-extrabold text-navy-900 md:text-[28px]">
              {empresa.razaoSocial}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {formatCNPJ(empresa.cnpj)} · Grupo {empresa.grupoEsocial} (desde {grupo?.desde}) ·{" "}
              {TIPO_ACESSO_LABEL[empresa.tipoAcesso]}
            </p>
            <div className="mt-3">
              <StatusSolicitacaoBadge status={sol.status} />
            </div>
            <p className="mt-3 max-w-2xl text-sm text-ink-muted">
              {STATUS_SOLICITACAO_HINT[sol.status]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sol.relatorioDisponivel && (
              <Button
                iconLeft={<FileSpreadsheet aria-hidden className="size-5" />}
                onClick={() => navigate(`/solicitacoes/${sol.id}/relatorio`)}
              >
                Ver relatório
              </Button>
            )}
            <Button
              variant="secondary"
              iconLeft={<RefreshCw aria-hidden className="size-5" />}
              onClick={() => atualizarDados(sol.id)}
              disabled={sol.status === "cancelado"}
            >
              Atualizar dados
            </Button>
          </div>
        </div>

        {sol.relatorioParcial && sol.relatorioDisponivel && (
          <div
            role="status"
            className="mt-4 rounded-md border border-warning-200 bg-warning-100 px-4 py-3 text-sm text-warning-600"
          >
            Relatório parcial: ainda faltam períodos. Você já pode consultar as tabelas e baixar o
            Excel; o consolidado é regerado a cada importação.
          </div>
        )}

        {sol.logErro && (
          <pre className="mt-4 overflow-x-auto rounded-md bg-danger-100 p-4 text-xs text-danger-600">
            {sol.logErro}
          </pre>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Criado em" value={`${criado.data} ${criado.hora}`} />
        <Meta label="Atualizado em" value={`${atualizado.data} ${atualizado.hora}`} />
        <Meta label="Modo" value="Automático" />
        <Meta
          label="A partir de"
          value={sol.aPartirDe ?? `Grupo ${empresa.grupoEsocial} (${grupo?.desde})`}
        />
      </div>

      <section className="rounded-2xl bg-surface-0 shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold text-navy-900">Períodos da extração</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Cada competência pode ser repedida ao eSocial ou reimportada do ZIP (mock).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-surface-50 text-navy-900">
              <tr>
                <th className="px-5 py-3 font-semibold">Competência</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sol.periodos.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 tabular-nums font-semibold text-navy-900">
                    {p.competencia}
                  </td>
                  <td className="px-5 py-3 capitalize text-ink-muted">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          iconLeft={<FileSpreadsheet aria-hidden className="size-5" />}
          onClick={() => {
            gerarRelatorioAgora(sol.id);
            navigate(`/solicitacoes/${sol.id}/relatorio`);
          }}
          disabled={!emCurso && !sol.relatorioDisponivel && sol.status === "criado"}
        >
          Gerar relatório agora
        </Button>
        <Button
          variant="secondary"
          iconLeft={<Calculator aria-hidden className="size-5" />}
          onClick={() => navigate(`/empresas/${empresa.id}/sat-rat`)}
        >
          SAT/RAT
        </Button>
        {(sol.status === "com_erro" || sol.status === "cancelado") && (
          <Button
            variant="secondary"
            iconLeft={<RotateCcw aria-hidden className="size-5" />}
            onClick={() => reiniciarSolicitacao(sol.id)}
          >
            Reiniciar
          </Button>
        )}
        {emCurso && (
          <Button
            variant="ghost"
            iconLeft={<Ban aria-hidden className="size-5" />}
            onClick={() => cancelarSolicitacao(sol.id)}
          >
            Cancelar
          </Button>
        )}
        <Link
          to={`/empresas/${empresa.id}`}
          className="inline-flex h-12 items-center px-4 text-sm font-semibold text-blue-600"
        >
          Ver empresa
        </Link>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-0 p-5 shadow-card">
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      <p className="mt-2 text-[15px] font-bold text-navy-900">{value}</p>
    </div>
  );
}
