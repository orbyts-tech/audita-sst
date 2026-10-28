import type { StatusAnalise } from "@/components/ui/StatusBadge";

export interface Analise {
  id: string;
  empresaId: string;
  titulo: string;
  status: StatusAnalise;
  passivoEstimado: number;
  progresso: number;
  atualizadoEm: string;
  resumo?: string;
}
