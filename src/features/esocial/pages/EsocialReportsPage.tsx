import { useDeferredValue, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { usePagination } from "@/hooks/usePagination";
import { formatCNPJ, formatAtualizacao, formatBRL, normalizar } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useApp } from "@/app/AppProvider";
import { useEsocial } from "../EsocialProvider";
import { ruleSetVersion } from "../rules/catalog";
import { ConsolidadoTable } from "../components/ConsolidadoTable";
import { ReportDataTable, type ReportColumn } from "../components/ReportDataTable";
import type { AuditFinding, EventType, FinancialCalcStatus, RawEvent } from "../types";

type ReportTabId =
  | "consolidado"
  | "s2210"
  | "s2220"
  | "s2230"
  | "s2240"
  | "detalhado"
  | "calculo-passivo"
  | "obrigacao"
  | "consolidado-passivo"
  | "painel"
  | "sumario";

const TABS: { id: ReportTabId; label: string }[] = [
  { id: "consolidado", label: "Consolidado" },
  { id: "s2210", label: "S-2210" },
  { id: "s2220", label: "S-2220" },
  { id: "s2230", label: "S-2230" },
  { id: "s2240", label: "S-2240" },
  { id: "detalhado", label: "Detalhado" },
  { id: "calculo-passivo", label: "Cálculo do passivo" },
  { id: "obrigacao", label: "Obrigação acessória" },
  { id: "consolidado-passivo", label: "Consolidado do passivo" },
  { id: "painel", label: "Painel" },
  { id: "sumario", label: "Sumário executivo" },
];

const EVENT_TAB: Partial<Record<ReportTabId, EventType>> = {
  s2210: "S-2210",
  s2220: "S-2220",
  s2230: "S-2230",
  s2240: "S-2240",
};

export function EsocialReportsPage() {
  const { id = "" } = useParams<{ id: string }>();
  return <ReportViewer companyId={id} />;
}

/** Mais linhas por página no relatório = menos paginação / scroll de página. */
const REPORT_PAGE_SIZE = 50;

export function ReportViewer({
  companyId,
  parcial,
  compact = false,
}: {
  companyId: string;
  parcial?: boolean;
  /** Layout em tela cheia (página da solicitação). */
  compact?: boolean;
}) {
  const { obterEmpresa } = useApp();
  const { getSummary, getConsolidado, getEvents, getFindings, getFinancial, getBatches } =
    useEsocial();
  const empresa = obterEmpresa(companyId);
  const summary = getSummary(companyId);
  const consolidado = getConsolidado(companyId);
  const findings = getFindings(companyId);
  const financial = getFinancial(companyId);
  const batches = getBatches(companyId);
  const latestBatch = batches[0];

  const [tab, setTab] = useState<ReportTabId>("consolidado");
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const termo = useDeferredValue(busca);

  const eventType = EVENT_TAB[tab];
  const events = getEvents(companyId, eventType ?? "Todos");

  const consolidadoFiltrado = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return consolidado;
    return consolidado.filter(
      (r) =>
        normalizar(r.nome).includes(t) ||
        normalizar(r.matricula).includes(t) ||
        normalizar(r.cargo).includes(t) ||
        r.cpfMasked.replace(/\D/g, "").includes(t.replace(/\D/g, "")),
    );
  }, [consolidado, termo]);

  const eventsFiltrados = useMemo(() => {
    if (!eventType) return [];
    const list = events.filter((e) => e.eventType === eventType);
    const t = normalizar(termo.trim());
    if (!t) return list;
    return list.filter(
      (e) =>
        normalizar(e.workerName ?? "").includes(t) ||
        normalizar(e.matricula ?? "").includes(t) ||
        normalizar(e.eventId).includes(t),
    );
  }, [events, eventType, termo]);

  const findingsFiltrados = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return findings;
    return findings.filter(
      (f) =>
        normalizar(f.title).includes(t) ||
        normalizar(f.workerName ?? "").includes(t) ||
        normalizar(f.ruleKey).includes(t),
    );
  }, [findings, termo]);

  const pageConsolidado = usePagination(
    consolidadoFiltrado,
    `c|${termo}|${consolidadoFiltrado.length}`,
    REPORT_PAGE_SIZE,
  );
  const pageEvents = usePagination(
    eventsFiltrados,
    `e|${tab}|${termo}|${eventsFiltrados.length}`,
    REPORT_PAGE_SIZE,
  );
  const pageFindings = usePagination(
    findingsFiltrados,
    `f|${termo}|${findingsFiltrados.length}`,
    REPORT_PAGE_SIZE,
  );

  const extraidoEm = summary?.ultimaImportacaoEm
    ? formatAtualizacao(summary.ultimaImportacaoEm)
    : latestBatch?.completedAt
      ? formatAtualizacao(latestBatch.completedAt)
      : null;
  const solicitadoEm = latestBatch?.requestedAt
    ? formatAtualizacao(latestBatch.requestedAt)
    : extraidoEm;

  function exportarExcel() {
    if (!empresa) return;
    const body = [
      `Audita SST — Excel (stub)`,
      `CNPJ: ${formatCNPJ(empresa.cnpj)}`,
      `Empresa: ${empresa.razaoSocial}`,
      `Aba ativa: ${tab}`,
      `Linhas consolidado: ${consolidado.length}`,
      `Regras: ${ruleSetVersion()}`,
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audita-sst-${empresa.cnpj}-relatorio.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Download iniciado (stub). O Excel completo virá na próxima etapa.");
  }

  if (!empresa) return null;

  const showSearch =
    tab === "consolidado" || tab === "detalhado" || Boolean(eventType);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-2",
        compact && "min-h-0 flex-1",
      )}
    >
      {parcial && (
        <div
          role="status"
          className="shrink-0 rounded-md border border-warning-200 bg-warning-100 px-3 py-2 text-xs text-warning-600"
        >
          Relatório parcial — períodos ainda em extração.
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <MetaChip label="CNPJ" value={formatCNPJ(empresa.cnpj)} dense />
          {solicitadoEm && (
            <MetaChip
              label="Solicitado"
              value={`${solicitadoEm.data} ${solicitadoEm.hora.replace("às ", "")}`}
              dense
            />
          )}
          {extraidoEm && (
            <MetaChip
              label="Extraído"
              value={`${extraidoEm.data} ${extraidoEm.hora.replace("às ", "")}`}
              dense
            />
          )}
          {summary?.periodoAnalisado && (
            <MetaChip label="Período" value={summary.periodoAnalisado} dense />
          )}
        </div>
        <Button
          size="sm"
          iconLeft={<FileSpreadsheet aria-hidden className="size-4" />}
          onClick={exportarExcel}
        >
          Download do Excel
        </Button>
      </div>

      {msg && (
        <p className="flex shrink-0 items-center gap-2 text-sm font-semibold text-success-600" role="status">
          <Download aria-hidden className="size-4" />
          {msg}
        </p>
      )}

      <div
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-2xl bg-surface-0 shadow-card",
          compact ? "flex-1" : "min-h-[70vh]",
        )}
      >
        <nav
          aria-label="Abas do relatório"
          className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border px-2"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setBusca("");
              }}
              className={cn(
                "shrink-0 border-b-2 px-2.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors sm:text-sm",
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-ink-muted hover:text-navy-900",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {showSearch && (
          <div className="shrink-0 border-b border-border px-3 py-2">
            <SearchInput
              label="Filtrar tabela"
              placeholder="Filtrar linhas da tabela..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="max-w-lg [&_input]:h-10"
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          {tab === "consolidado" &&
            (pageConsolidado.items.length > 0 ? (
              <ConsolidadoTable
                rows={pageConsolidado.items}
                startIndex={pageConsolidado.from}
              />
            ) : (
              <Empty termo={Boolean(termo)} />
            ))}

          {eventType && (
            <ReportDataTable
              rows={pageEvents.items}
              emptyMessage={
                termo
                  ? "Nenhum evento para este filtro."
                  : `Nenhum evento ${eventType} nesta extração.`
              }
              columns={EVENT_COLUMNS}
              dense
            />
          )}

          {tab === "detalhado" && (
            <ReportDataTable
              rows={pageFindings.items}
              emptyMessage={
                termo ? "Nenhum achado para este filtro." : "Nenhum achado detalhado."
              }
              columns={FINDING_COLUMNS}
              dense
            />
          )}

          {(tab === "calculo-passivo" ||
            tab === "obrigacao" ||
            tab === "consolidado-passivo") && (
            <ReportDataTable
              rows={financial.map((f, i) => ({ ...f, id: `${f.component}-${i}` }))}
              emptyMessage="Sem linhas de passivo nesta extração."
              columns={FINANCIAL_COLUMNS}
              dense
            />
          )}

          {tab === "painel" && summary && (
            <ReportDataTable
              rows={painelRows(summary.contagens)}
              columns={PAINEL_COLUMNS}
              dense
            />
          )}

          {tab === "sumario" && summary && (
            <ReportDataTable
              rows={[
                { id: "sum-1", item: "Cobertura", valor: summary.cobertura },
                { id: "sum-2", item: "Processamento", valor: summary.processamento },
                {
                  id: "sum-3",
                  item: "Período analisado",
                  valor: summary.periodoAnalisado ?? "—",
                },
                {
                  id: "sum-4",
                  item: "Trabalhadores (consolidado)",
                  valor: String(consolidado.length),
                },
                { id: "sum-5", item: "Achados", valor: String(findings.length) },
                { id: "sum-6", item: "Regras", valor: summary.analiseAtual },
              ]}
              columns={SUMARIO_COLUMNS}
              dense
            />
          )}
        </div>

        <div className="shrink-0 border-t border-border">
          {tab === "consolidado" && <TablePager page={pageConsolidado} />}
          {eventType && <TablePager page={pageEvents} />}
          {tab === "detalhado" && <TablePager page={pageFindings} />}
        </div>
      </div>

      <p className="shrink-0 text-xs text-ink-muted">
        Mesmas abas do Excel · CPF mascarado · Role na horizontal se precisar das colunas à
        direita
      </p>
    </div>
  );
}

function MetaChip({
  label,
  value,
  dense,
}: {
  label: string;
  value: string;
  dense?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-0 shadow-card",
        dense ? "px-2.5 py-1.5" : "px-3 py-2",
      )}
    >
      <span className="text-xs font-medium text-ink-muted">{label}: </span>
      <span
        className={cn(
          "font-semibold text-navy-900",
          dense ? "text-xs" : "text-sm",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Empty({ termo }: { termo: boolean }) {
  return (
    <p className="px-4 py-12 text-center text-sm text-ink-muted">
      {termo
        ? "Nenhuma linha para este filtro."
        : "Nenhum dado no consolidado. Importe XML/ZIP primeiro."}
    </p>
  );
}

function TablePager({
  page,
}: {
  page: ReturnType<typeof usePagination<unknown>>;
}) {
  return (
    <Pagination
      className="px-3 py-2"
      page={page.page}
      totalPages={page.totalPages}
      total={page.total}
      from={page.from}
      to={page.to}
      onChange={page.setPage}
    />
  );
}

function painelRows(c: {
  trabalhadores: number;
  s2210: number;
  s2220: number;
  s2220Exames: number;
  s2230: number;
  s2240: number;
  achadosRevisao: number;
}) {
  return [
    { id: "p1", indicador: "Trabalhadores", quantidade: c.trabalhadores },
    { id: "p2", indicador: "S-2210 (CAT)", quantidade: c.s2210 },
    { id: "p3", indicador: "S-2220 (ASO — eventos)", quantidade: c.s2220 },
    { id: "p4", indicador: "S-2220 (exames)", quantidade: c.s2220Exames },
    { id: "p5", indicador: "S-2230", quantidade: c.s2230 },
    { id: "p6", indicador: "S-2240", quantidade: c.s2240 },
    { id: "p7", indicador: "Achados em revisão", quantidade: c.achadosRevisao },
  ];
}

const EVENT_COLUMNS: ReportColumn<RawEvent>[] = [
  { key: "tipo", header: "Tipo", cell: (e) => e.eventType },
  {
    key: "trabalhador",
    header: "Trabalhador",
    cell: (e) => e.workerName ?? "—",
    className: "font-semibold whitespace-nowrap",
  },
  { key: "cpf", header: "CPF", cell: (e) => e.cpfMasked ?? "—", className: "whitespace-nowrap" },
  {
    key: "matricula",
    header: "Matrícula",
    cell: (e) => e.matricula ?? "—",
    className: "tabular-nums",
  },
  {
    key: "data",
    header: "Data do evento",
    cell: (e) => (e.eventDate ? formatAtualizacao(e.eventDate).data : "—"),
    className: "tabular-nums whitespace-nowrap",
  },
  {
    key: "recibo",
    header: "Recibo",
    cell: (e) => e.receipt ?? "—",
    className: "whitespace-nowrap text-ink-muted",
  },
  {
    key: "id",
    header: "ID evento",
    cell: (e) => e.eventId,
    className: "whitespace-nowrap text-ink-muted",
  },
  {
    key: "status",
    header: "Parse",
    cell: (e) => e.parseStatus,
  },
];

const FINDING_COLUMNS: ReportColumn<AuditFinding>[] = [
  {
    key: "trabalhador",
    header: "Trabalhador",
    cell: (f) => f.workerName ?? "—",
    className: "font-semibold whitespace-nowrap",
  },
  { key: "regra", header: "Regra", cell: (f) => f.ruleKey, className: "whitespace-nowrap" },
  {
    key: "titulo",
    header: "Achado",
    cell: (f) => f.title,
    className: "max-w-[280px]",
  },
  { key: "severidade", header: "Severidade", cell: (f) => f.severity },
  { key: "status", header: "Status", cell: (f) => f.status },
  {
    key: "intervalo",
    header: "Intervalo",
    cell: (f) => f.affectedInterval ?? "—",
    className: "whitespace-nowrap",
  },
];

type FinRow = FinancialCalcStatus & { id: string };

const FINANCIAL_COLUMNS: ReportColumn<FinRow>[] = [
  {
    key: "comp",
    header: "Componente",
    cell: (f) => f.component,
    className: "font-semibold",
  },
  { key: "status", header: "Status", cell: (f) => f.status },
  {
    key: "valor",
    header: "Valor",
    cell: (f) => (f.amount != null ? formatBRL(f.amount) : "—"),
    className: "tabular-nums",
  },
  {
    key: "motivo",
    header: "Motivo / observação",
    cell: (f) => f.reason ?? "—",
    className: "max-w-[360px] text-ink-muted",
  },
];

const PAINEL_COLUMNS: ReportColumn<{ id: string; indicador: string; quantidade: number }>[] = [
  { key: "ind", header: "Indicador", cell: (r) => r.indicador, className: "font-semibold" },
  {
    key: "qtd",
    header: "Quantidade",
    cell: (r) => r.quantidade,
    className: "tabular-nums font-semibold",
  },
];

const SUMARIO_COLUMNS: ReportColumn<{ id: string; item: string; valor: string }>[] = [
  { key: "item", header: "Item", cell: (r) => r.item, className: "font-semibold" },
  { key: "valor", header: "Valor", cell: (r) => r.valor },
];
