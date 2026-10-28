import type { StatusAnalise } from "@/components/ui/StatusBadge";
import type { Empresa } from "./types";

export type FiltrosEmpresas = {
  status: StatusAnalise[];
  segmentos: string[];
  passivoMin: string;
  passivoMax: string;
};

export const FILTROS_VAZIOS: FiltrosEmpresas = {
  status: [],
  segmentos: [],
  passivoMin: "",
  passivoMax: "",
};

export function contarFiltrosAtivos(f: FiltrosEmpresas) {
  let n = 0;
  if (f.status.length) n += 1;
  if (f.segmentos.length) n += 1;
  if (f.passivoMin.trim() || f.passivoMax.trim()) n += 1;
  return n;
}

export function aplicarFiltros(empresas: Empresa[], f: FiltrosEmpresas) {
  return empresas.filter((e) => {
    if (f.status.length && !f.status.includes(e.status)) return false;
    if (f.segmentos.length && !f.segmentos.includes(e.segmento)) return false;
    const min = f.passivoMin.trim() ? Number(f.passivoMin) : null;
    const max = f.passivoMax.trim() ? Number(f.passivoMax) : null;
    if (min != null && !Number.isNaN(min) && e.passivoEstimado < min) return false;
    if (max != null && !Number.isNaN(max) && e.passivoEstimado > max) return false;
    return true;
  });
}

export const SEGMENTOS_OPCOES = [
  "Indústria de Manufatura",
  "Comércio Varejista",
  "Prestação de Serviços",
  "Construção Civil",
  "Transporte Rodoviário",
] as const;
