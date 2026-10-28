import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAdapter } from "./adapters/manualAdapter";
import { resolveSourceFromFiles } from "./adapters/SourceAdapter";
import { seedConsolidado } from "./mock/consolidado";
import {
  seedBatches,
  seedEvents,
  seedFinancial,
  seedFindings,
  seedSummary,
  seedWorkers,
} from "./mock/seed";
import { simulateImportPipeline } from "./pipeline/simulateImport";
import type {
  AcquisitionBatch,
  AcquisitionRequest,
  AuditFinding,
  EsocialSummary,
  EventType,
  FinancialCalcStatus,
  RawEvent,
  WorkerSummary,
} from "./types";
import type { ConsolidadoRow } from "./types/report";

type CompanyBucket = {
  summary: EsocialSummary;
  batches: AcquisitionBatch[];
  workers: WorkerSummary[];
  events: RawEvent[];
  findings: AuditFinding[];
  financial: FinancialCalcStatus[];
  consolidado: ConsolidadoRow[];
};

type EsocialContextValue = {
  ensureCompany: (companyId: string) => void;
  getSummary: (companyId: string) => EsocialSummary | undefined;
  getBatches: (companyId: string) => AcquisitionBatch[];
  getWorkers: (companyId: string) => WorkerSummary[];
  getEvents: (companyId: string, type?: EventType | "Todos") => RawEvent[];
  getFindings: (companyId: string) => AuditFinding[];
  getFinancial: (companyId: string) => FinancialCalcStatus[];
  getConsolidado: (companyId: string) => ConsolidadoRow[];
  getEvent: (companyId: string, eventId: string) => RawEvent | undefined;
  getFinding: (companyId: string, findingId: string) => AuditFinding | undefined;
  startImport: (
    companyId: string,
    cnpj: string,
    files: { name: string; size: number }[],
  ) => Promise<AcquisitionBatch>;
  activeBatchId: string | null;
};

const EsocialContext = createContext<EsocialContextValue | null>(null);

function seededBucket(companyId: string, cnpj = "12345678000190"): CompanyBucket {
  return {
    summary: seedSummary(companyId),
    batches: seedBatches(companyId),
    workers: seedWorkers(companyId),
    events: seedEvents(companyId),
    findings: seedFindings(companyId),
    financial: seedFinancial(companyId),
    consolidado: seedConsolidado(companyId, cnpj),
  };
}

export function EsocialProvider({ children }: { children: ReactNode }) {
  const [byCompany, setByCompany] = useState<Record<string, CompanyBucket>>({});
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  const ensureCompany = useCallback((companyId: string) => {
    setByCompany((prev) => {
      if (prev[companyId]) return prev;
      // MVP: dataset de demonstração para qualquer empresa com solicitação/relatório
      return { ...prev, [companyId]: seededBucket(companyId) };
    });
  }, []);

  const patchCompany = useCallback((companyId: string, updater: (b: CompanyBucket) => CompanyBucket) => {
    setByCompany((prev) => {
      const current = prev[companyId] ?? seededBucket(companyId);
      return { ...prev, [companyId]: updater(current) };
    });
  }, []);

  const getBucket = useCallback(
    (companyId: string) => byCompany[companyId],
    [byCompany],
  );

  const startImport = useCallback(
    async (companyId: string, cnpj: string, files: { name: string; size: number }[]) => {
      const source = resolveSourceFromFiles(files.map((f) => f.name));
      const adapter = getAdapter(source);
      const request: AcquisitionRequest = { companyId, cnpj, source, files };
      const batch = await adapter.acquire(request);
      setActiveBatchId(batch.id);

      patchCompany(companyId, (b) => ({
        ...b,
        batches: [batch, ...b.batches],
        summary: {
          ...b.summary,
          processamento: "processando",
          origem: source,
        },
      }));

      const finalBatch = await simulateImportPipeline(batch, (progress) => {
        patchCompany(companyId, (b) => ({
          ...b,
          batches: b.batches.map((x) => (x.id === progress.id ? progress : x)),
          summary: {
            ...b.summary,
            processamento: progress.phase === "concluido" ? "parcial" : "processando",
            ultimaImportacaoEm:
              progress.phase === "concluido" ? progress.completedAt : b.summary.ultimaImportacaoEm,
            cobertura: progress.phase === "concluido" ? "parcial" : b.summary.cobertura,
            bannerParcial:
              progress.phase === "concluido"
                ? "Extração parcial: o sistema não declara cobertura total do histórico da empresa."
                : b.summary.bannerParcial,
          },
        }));
      });

      // Reimportação: se já havia seed, mantém dados; senão aplica seed demonstrativo
      patchCompany(companyId, (b) => {
        const hasData = b.events.length > 0;
        if (hasData) {
          return {
            ...b,
            batches: b.batches.map((x) => (x.id === finalBatch.id ? finalBatch : x)),
          };
        }
        const seeded = seededBucket(companyId, cnpj);
        return {
          ...seeded,
          batches: [finalBatch, ...seeded.batches.filter((x) => x.id !== finalBatch.id)],
          consolidado: seedConsolidado(companyId, cnpj),
          summary: {
            ...seeded.summary,
            ultimaImportacaoEm: finalBatch.completedAt,
            origem: finalBatch.source,
            processamento: "parcial",
            cobertura: "parcial",
          },
        };
      });

      setActiveBatchId(null);
      return finalBatch;
    },
    [patchCompany],
  );

  const value = useMemo<EsocialContextValue>(
    () => ({
      ensureCompany,
      getSummary: (id) => getBucket(id)?.summary,
      getBatches: (id) => getBucket(id)?.batches ?? [],
      getWorkers: (id) => getBucket(id)?.workers ?? [],
      getEvents: (id, type) => {
        const events = getBucket(id)?.events ?? [];
        if (!type || type === "Todos") return events;
        return events.filter((e) => e.eventType === type);
      },
      getFindings: (id) => getBucket(id)?.findings ?? [],
      getFinancial: (id) => getBucket(id)?.financial ?? [],
      getConsolidado: (id) => getBucket(id)?.consolidado ?? [],
      getEvent: (companyId, eventId) =>
        getBucket(companyId)?.events.find((e) => e.id === eventId),
      getFinding: (companyId, findingId) =>
        getBucket(companyId)?.findings.find((f) => f.id === findingId),
      startImport,
      activeBatchId,
    }),
    [ensureCompany, getBucket, startImport, activeBatchId],
  );

  return <EsocialContext.Provider value={value}>{children}</EsocialContext.Provider>;
}

export function useEsocial() {
  const ctx = useContext(EsocialContext);
  if (!ctx) throw new Error("useEsocial deve ser usado dentro de EsocialProvider");
  return ctx;
}
