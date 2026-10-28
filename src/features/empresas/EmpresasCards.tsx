import { ChevronRight } from "lucide-react";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { COBERTURA_LABEL, EXTRACAO_LABEL } from "@/features/esocial/labels";
import { formatAtualizacao } from "@/lib/format";
import type { Empresa } from "./types";

/** Lista em cards para viewports &lt; 1024px. */
export function EmpresasCards({
  empresas,
  onAbrir,
}: {
  empresas: Empresa[];
  onAbrir: (empresa: Empresa) => void;
}) {
  return (
    <ul className="flex flex-col gap-3 lg:hidden">
      {empresas.map((e) => {
        const importacao = e.ultimaImportacaoEm
          ? formatAtualizacao(e.ultimaImportacaoEm)
          : null;
        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onAbrir(e)}
              className="flex w-full flex-col gap-3 rounded-xl border border-border bg-surface-0 p-4 text-left transition-colors hover:bg-surface-50"
            >
              <div className="flex items-start gap-3">
                <InitialsAvatar id={e.id} nome={e.razaoSocial} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-navy-900">{e.razaoSocial}</div>
                  <div className="truncate text-sm text-ink-muted">{e.segmento}</div>
                </div>
                <ChevronRight aria-hidden className="mt-1 size-5 shrink-0 text-ink-muted" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={e.status} />
                <div className="text-sm font-semibold text-navy-900">
                  {COBERTURA_LABEL[e.coberturaEsocial]}
                </div>
              </div>
              <div className="text-sm text-ink-muted">
                Extração: {EXTRACAO_LABEL[e.situacaoExtracao]}
                {importacao ? ` · Importação ${importacao.data}` : " · Sem importação"}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
