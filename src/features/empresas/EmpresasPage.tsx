import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { Building2, ListFilter, Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { usePagination } from "@/hooks/usePagination";
import { normalizar } from "@/lib/format";
import { EmpresasCards } from "./EmpresasCards";
import { EmpresasTable, EmpresasTableSkeleton } from "./EmpresasTable";
import type { Empresa } from "./types";

export interface EmpresasPageProps {
  empresas: Empresa[];
  carregando?: boolean;
  erro?: string | null;
  onTentarNovamente?: () => void;
  onNovaEmpresa: () => void;
  onAbrirFiltros: () => void;
  onAbrirEmpresa: (empresa: Empresa) => void;
  filtrosAtivos?: number;
}

export function EmpresasPage({
  empresas,
  carregando,
  erro,
  onTentarNovamente,
  onNovaEmpresa,
  onAbrirFiltros,
  onAbrirEmpresa,
  filtrosAtivos = 0,
}: EmpresasPageProps) {
  const [busca, setBusca] = useState("");
  const termo = useDeferredValue(busca);

  const filtradas = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return empresas;
    const digitos = t.replace(/\D/g, "");
    return empresas.filter(
      (e) =>
        normalizar(e.razaoSocial).includes(t) ||
        (digitos.length > 0 && e.cnpj.includes(digitos)),
    );
  }, [empresas, termo]);

  const { items, page, setPage, total, totalPages, from, to } = usePagination(
    filtradas,
    `${termo}|${filtrosAtivos}|${empresas.length}`,
  );

  const lista = (
    <>
      <EmpresasTable empresas={items} onAbrir={onAbrirEmpresa} />
      <EmpresasCards empresas={items} onAbrir={onAbrirEmpresa} />
    </>
  );

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 md:gap-8">
      <header>
        <h1 className="text-[32px] leading-10 font-extrabold tracking-[-0.01em] text-navy-900 md:text-[44px] md:leading-[52px]">
          Empresas
        </h1>
        <p className="mt-1 text-base text-ink-muted md:text-lg">
          Localize ou cadastre o CNPJ e abra os dados do eSocial da empresa.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3.5">
        <SearchInput
          label="Buscar empresa por razão social ou CNPJ"
          placeholder="Buscar por razão social ou CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="min-w-0 w-full sm:min-w-[280px] sm:flex-1"
        />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={onAbrirFiltros}
            iconLeft={<ListFilter aria-hidden className="size-5" />}
            className="flex-1 sm:flex-none"
          >
            {filtrosAtivos > 0 ? `Filtros (${filtrosAtivos})` : "Filtros"}
          </Button>
          <Button
            size="lg"
            onClick={onNovaEmpresa}
            iconLeft={<Plus aria-hidden className="size-5" strokeWidth={2.4} />}
            className="flex-1 sm:flex-none"
          >
            Nova empresa
          </Button>
        </div>
      </div>

      <section
        aria-label="Lista de empresas"
        className="rounded-2xl bg-surface-0 p-3 shadow-card sm:p-4"
      >
        <div className="overflow-x-auto">
          {carregando ? (
            <EmpresasTableSkeleton />
          ) : erro ? (
            <EstadoVazio
              icone={<SearchX aria-hidden className="size-7" />}
              titulo="Não foi possível carregar as empresas"
              texto={erro}
              acao={
                onTentarNovamente && (
                  <Button variant="secondary" onClick={onTentarNovamente}>
                    Tentar novamente
                  </Button>
                )
              }
            />
          ) : empresas.length === 0 && filtrosAtivos === 0 ? (
            <EstadoVazio
              icone={<Building2 aria-hidden className="size-7" />}
              titulo="Nenhuma empresa cadastrada"
              texto="Cadastre a primeira empresa para começar a acompanhar o passivo de SST."
              acao={
                <Button onClick={onNovaEmpresa} iconLeft={<Plus aria-hidden className="size-5" />}>
                  Nova empresa
                </Button>
              }
            />
          ) : filtradas.length === 0 ? (
            <EstadoVazio
              icone={<SearchX aria-hidden className="size-7" />}
              titulo="Nenhuma empresa encontrada"
              texto={
                busca.trim()
                  ? `Nada corresponde a "${busca}". Confira a razão social ou o CNPJ.`
                  : "Nenhum resultado com os filtros aplicados. Ajuste ou limpe os filtros."
              }
              acao={
                busca.trim() ? (
                  <Button variant="ghost" onClick={() => setBusca("")}>
                    Limpar busca
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={onAbrirFiltros}>
                    Ajustar filtros
                  </Button>
                )
              }
            />
          ) : (
            lista
          )}
        </div>

        {!carregando && !erro && filtradas.length > 0 && (
          <Pagination
            className="mt-4 border-t border-border pt-4"
            page={page}
            totalPages={totalPages}
            total={total}
            from={from}
            to={to}
            onChange={setPage}
          />
        )}
      </section>
      <p className="sr-only" aria-live="polite">
        {`${filtradas.length} empresas na lista, página ${page} de ${totalPages}`}
      </p>
    </div>
  );
}

function EstadoVazio({
  icone,
  titulo,
  texto,
  acao,
}: {
  icone: ReactNode;
  titulo: string;
  texto: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        {icone}
      </span>
      <h2 className="text-lg font-bold text-navy-900">{titulo}</h2>
      <p className="max-w-md text-[15px] text-ink-muted">{texto}</p>
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}
