import { ChevronRight } from "lucide-react";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { COBERTURA_LABEL, EXTRACAO_LABEL } from "@/features/esocial/labels";
import { formatAtualizacao, formatCNPJ } from "@/lib/format";
import type { Empresa } from "./types";

const COLS =
  "grid grid-cols-[minmax(200px,1.6fr)_minmax(150px,1fr)_minmax(120px,0.9fr)_minmax(100px,0.8fr)_minmax(110px,0.85fr)_minmax(110px,0.85fr)_48px] items-center gap-3";

export function EmpresasTable({
  empresas,
  onAbrir,
}: {
  empresas: Empresa[];
  onAbrir: (empresa: Empresa) => void;
}) {
  return (
    <div
      role="table"
      aria-label="Empresas"
      aria-rowcount={empresas.length + 1}
      className="hidden min-w-[960px] lg:block"
    >
      <div role="rowgroup">
        <div
          role="row"
          className={`${COLS} h-[46px] rounded-lg bg-surface-50 px-4 text-sm font-semibold whitespace-nowrap text-navy-900`}
        >
          <span role="columnheader">Empresa</span>
          <span role="columnheader">CNPJ</span>
          <span role="columnheader">Última importação</span>
          <span role="columnheader">Cobertura</span>
          <span role="columnheader">Extração</span>
          <span role="columnheader">Análise</span>
          <span role="columnheader" className="sr-only">
            Ações
          </span>
        </div>
      </div>
      <div role="rowgroup">
        {empresas.map((e) => {
          const importacao = e.ultimaImportacaoEm
            ? formatAtualizacao(e.ultimaImportacaoEm)
            : null;
          return (
            <div
              key={e.id}
              role="row"
              tabIndex={0}
              onClick={() => onAbrir(e)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onAbrir(e);
                }
              }}
              className={`${COLS} min-h-[92px] cursor-pointer border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-50`}
            >
              <div role="cell" className="flex min-w-0 items-center gap-4">
                <InitialsAvatar id={e.id} nome={e.razaoSocial} />
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-navy-900">{e.razaoSocial}</div>
                  <div className="truncate text-sm text-ink-muted">{e.segmento}</div>
                </div>
              </div>
              <div role="cell" className="text-[15px] whitespace-nowrap text-navy-900 tabular-nums">
                {formatCNPJ(e.cnpj)}
              </div>
              <div role="cell" className="leading-tight">
                {importacao ? (
                  <>
                    <div className="text-[15px] text-navy-900 tabular-nums">{importacao.data}</div>
                    <div className="text-[13px] text-ink-muted">{importacao.hora}</div>
                  </>
                ) : (
                  <span className="text-sm text-ink-muted">—</span>
                )}
              </div>
              <div role="cell" className="text-sm font-semibold text-navy-900">
                {COBERTURA_LABEL[e.coberturaEsocial]}
              </div>
              <div role="cell" className="text-sm text-navy-900">
                {EXTRACAO_LABEL[e.situacaoExtracao]}
              </div>
              <div role="cell">
                <StatusBadge status={e.status} />
              </div>
              <div role="cell" className="flex justify-end">
                <button
                  type="button"
                  aria-label={`Abrir ${e.razaoSocial}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onAbrir(e);
                  }}
                  className="inline-flex size-10 items-center justify-center rounded-[10px] bg-blue-100/60 text-navy-900 hover:bg-blue-100"
                >
                  <ChevronRight aria-hidden className="size-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EmpresasTableSkeleton({ linhas = 5 }: { linhas?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando empresas" className="flex flex-col">
      <div className="h-[46px] rounded-lg bg-surface-50" />
      {Array.from({ length: linhas }).map((_, i) => (
        <div
          key={i}
          className="flex h-[92px] items-center gap-4 border-b border-border px-4 last:border-b-0"
        >
          <div className="size-12 animate-pulse rounded-full bg-blue-100" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-48 animate-pulse rounded bg-blue-100" />
            <div className="h-3 w-32 animate-pulse rounded bg-surface-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
