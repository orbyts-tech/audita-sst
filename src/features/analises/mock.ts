import { EMPRESAS_MOCK } from "@/features/empresas/mock";
import type { Analise } from "./types";

const BASE: Analise[] = [
  {
    id: "a1",
    empresaId: "1",
    titulo: "Auditoria SST 2025 — Indústria Alpha",
    status: "completo",
    passivoEstimado: 284500,
    progresso: 100,
    atualizadoEm: "2025-04-14T10:24:00-03:00",
    resumo: "Análise concluída. Passivo consolidado com base em CAT, eSocial e PPRA.",
  },
  {
    id: "a2",
    empresaId: "2",
    titulo: "Auditoria SST 2025 — Comércio Beta",
    status: "em_analise",
    passivoEstimado: 126300,
    progresso: 62,
    atualizadoEm: "2025-04-10T16:18:00-03:00",
    resumo: "Em andamento: validação de eventos S-2210 e S-2220.",
  },
  {
    id: "a3",
    empresaId: "3",
    titulo: "Auditoria SST 2025 — Serviços Gama",
    status: "parcial",
    passivoEstimado: 42800,
    progresso: 40,
    atualizadoEm: "2025-04-08T09:42:00-03:00",
    resumo: "Documentação parcial recebida. Aguardando PPP histórico.",
  },
  {
    id: "a4",
    empresaId: "4",
    titulo: "Auditoria SST 2025 — Construtora Delta",
    status: "em_analise",
    passivoEstimado: 910250,
    progresso: 55,
    atualizadoEm: "2025-04-02T14:37:00-03:00",
    resumo: "Foco em canteiros e exposição a agentes químicos.",
  },
  {
    id: "a5",
    empresaId: "5",
    titulo: "Auditoria SST 2025 — Transportes Épsilon",
    status: "completo",
    passivoEstimado: 367100,
    progresso: 100,
    atualizadoEm: "2025-03-28T11:03:00-03:00",
    resumo: "Análise concluída. Relatório disponível para download.",
  },
];

const EXTRAS: Analise[] = EMPRESAS_MOCK.filter((e) => Number(e.id) > 5).map((e) => ({
  id: `a${e.id}`,
  empresaId: e.id,
  titulo: `Auditoria SST 2025 — ${e.razaoSocial.replace(/ Ltda\.$/, "")}`,
  status: e.status,
  passivoEstimado: e.passivoEstimado,
  progresso:
    e.status === "completo" ? 100 : e.status === "em_analise" ? 55 : e.status === "parcial" ? 35 : 5,
  atualizadoEm: e.atualizadoEm,
  resumo: "Análise gerada automaticamente para demonstração de paginação.",
}));

export const ANALISES_MOCK: Analise[] = [...BASE, ...EXTRAS];
