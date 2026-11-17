import { randomUUID } from "node:crypto";
import { getEnv } from "../config/env.js";
import { logger } from "../lib/logger.js";

export type ConsultaStatus =
  | "pendente"
  | "consultando"
  | "identificadores_encontrados"
  | "baixando_xml"
  | "concluida_com_dados"
  | "concluida_sem_registros"
  | "falha_autorizacao"
  | "falha_tecnica"
  | "quota_indisponivel";

export interface ConsultaRecord {
  id: string;
  companyId: string;
  ambiente: string;
  eventType: string;
  status: ConsultaStatus;
  cdResposta?: string;
  descResposta?: string;
  errorCode?: string;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface IdentificadorRecord {
  id: string;
  consultaId: string;
  companyId: string;
  eventType: string;
  eventId: string;
  nrRecibo?: string;
  createdAt: string;
}

export interface EventoRecord {
  id: string;
  companyId: string;
  consultaId?: string;
  ambiente: string;
  origem: string;
  eventType: string;
  eventId: string;
  nrRecibo?: string;
  dataRecepcao?: string;
  dataConsulta: string;
  layoutVersion?: string;
  situacao: string;
  xmlSha256: string;
  storagePath: string;
  payloadJson?: Record<string, unknown>;
  retificacaoDe?: string;
  createdAt: string;
}

export interface DataStore {
  createConsulta(input: Omit<ConsultaRecord, "id" | "startedAt"> & { id?: string }): Promise<ConsultaRecord>;
  updateConsulta(id: string, patch: Partial<ConsultaRecord>): Promise<ConsultaRecord | null>;
  getConsulta(id: string, companyId: string): Promise<ConsultaRecord | null>;
  listConsultas(companyId: string): Promise<ConsultaRecord[]>;
  addIdentificadores(rows: Omit<IdentificadorRecord, "id" | "createdAt">[]): Promise<IdentificadorRecord[]>;
  listIdentificadores(consultaId: string, companyId: string): Promise<IdentificadorRecord[]>;
  upsertEvento(row: Omit<EventoRecord, "id" | "createdAt"> & { id?: string }): Promise<EventoRecord>;
  listEventos(companyId: string, eventType?: string): Promise<EventoRecord[]>;
  getEvento(companyId: string, eventoId: string): Promise<EventoRecord | null>;
  getQuota(companyId: string, day: string): Promise<number>;
  incrementQuota(companyId: string, day: string): Promise<number>;
  tryLockEmployer(companyId: string): Promise<boolean>;
  unlockEmployer(companyId: string): Promise<void>;
  audit(action: string, meta: Record<string, unknown>): Promise<void>;
}

class MemoryStore implements DataStore {
  consultas = new Map<string, ConsultaRecord>();
  identificadores: IdentificadorRecord[] = [];
  eventos = new Map<string, EventoRecord>();
  quota = new Map<string, number>();
  locks = new Set<string>();
  audits: Array<{ action: string; meta: Record<string, unknown>; at: string }> = [];

  async createConsulta(input: Omit<ConsultaRecord, "id" | "startedAt"> & { id?: string }) {
    const row: ConsultaRecord = {
      ...input,
      id: input.id ?? randomUUID(),
      startedAt: new Date().toISOString(),
    };
    this.consultas.set(row.id, row);
    return row;
  }

  async updateConsulta(id: string, patch: Partial<ConsultaRecord>) {
    const cur = this.consultas.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch, id: cur.id };
    this.consultas.set(id, next);
    return next;
  }

  async getConsulta(id: string, companyId: string) {
    const row = this.consultas.get(id);
    if (!row || row.companyId !== companyId) return null;
    return row;
  }

  async listConsultas(companyId: string) {
    return [...this.consultas.values()]
      .filter((c) => c.companyId === companyId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async addIdentificadores(rows: Omit<IdentificadorRecord, "id" | "createdAt">[]) {
    const created = rows.map((r) => ({
      ...r,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }));
    this.identificadores.push(...created);
    return created;
  }

  async listIdentificadores(consultaId: string, companyId: string) {
    return this.identificadores.filter(
      (i) => i.consultaId === consultaId && i.companyId === companyId,
    );
  }

  async upsertEvento(row: Omit<EventoRecord, "id" | "createdAt"> & { id?: string }) {
    const existing = [...this.eventos.values()].find(
      (e) =>
        e.companyId === row.companyId &&
        e.eventId === row.eventId &&
        e.xmlSha256 === row.xmlSha256,
    );
    if (existing) return existing;
    const next: EventoRecord = {
      ...row,
      id: row.id ?? randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.eventos.set(next.id, next);
    return next;
  }

  async listEventos(companyId: string, eventType?: string) {
    return [...this.eventos.values()].filter(
      (e) => e.companyId === companyId && (!eventType || e.eventType === eventType),
    );
  }

  async getEvento(companyId: string, eventoId: string) {
    const row = this.eventos.get(eventoId);
    if (!row || row.companyId !== companyId) return null;
    return row;
  }

  async getQuota(companyId: string, day: string) {
    return this.quota.get(`${companyId}:${day}`) ?? 0;
  }

  async incrementQuota(companyId: string, day: string) {
    const key = `${companyId}:${day}`;
    const next = (this.quota.get(key) ?? 0) + 1;
    this.quota.set(key, next);
    return next;
  }

  async tryLockEmployer(companyId: string) {
    if (this.locks.has(companyId)) return false;
    this.locks.add(companyId);
    return true;
  }

  async unlockEmployer(companyId: string) {
    this.locks.delete(companyId);
  }

  async audit(action: string, meta: Record<string, unknown>) {
    this.audits.push({ action, meta, at: new Date().toISOString() });
    logger.info({ action, companyId: meta.companyId }, "audit");
  }
}

let store: DataStore | null = null;
let storeReady: Promise<DataStore> | null = null;

export function getStore(): DataStore {
  if (!store) {
    store = new MemoryStore();
  }
  return store;
}

/** Inicializa Postgres quando DATABASE_URL existir; senão mantém memória. */
export async function getStoreAsync(): Promise<DataStore> {
  if (storeReady) return storeReady;

  storeReady = (async () => {
    if (getEnv().DATABASE_URL) {
      const { createPostgresStore } = await import("./postgresStore.js");
      const pgStore = await createPostgresStore();
      if (pgStore) {
        store = pgStore;
        return store;
      }
      logger.warn("DATABASE_URL definida, mas conexão falhou — store em memória ativo.");
    }
    store = new MemoryStore();
    return store;
  })();

  return storeReady;
}

export function resetStoreForTests() {
  store = new MemoryStore();
  storeReady = null;
}
