import { randomUUID } from "node:crypto";
import pg from "pg";
import { getEnv } from "../config/env.js";
import { logger } from "../lib/logger.js";
import type {
  ConsultaRecord,
  DataStore,
  EventoRecord,
  IdentificadorRecord,
} from "./store.js";

const { Pool } = pg;

function toConsulta(row: pg.QueryResultRow): ConsultaRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    ambiente: row.ambiente,
    eventType: row.event_type,
    status: row.status,
    cdResposta: row.cd_resposta ?? undefined,
    descResposta: row.desc_resposta ?? undefined,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    startedAt: new Date(row.started_at).toISOString(),
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : undefined,
  };
}

function toIdentificador(row: pg.QueryResultRow): IdentificadorRecord {
  return {
    id: row.id,
    consultaId: row.consulta_id,
    companyId: row.company_id,
    eventType: row.event_type,
    eventId: row.event_id,
    nrRecibo: row.nr_recibo ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function toEvento(row: pg.QueryResultRow): EventoRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    consultaId: row.consulta_id ?? undefined,
    ambiente: row.ambiente,
    origem: row.origem,
    eventType: row.event_type,
    eventId: row.event_id,
    nrRecibo: row.nr_recibo ?? undefined,
    dataRecepcao: row.data_recepcao
      ? new Date(row.data_recepcao).toISOString()
      : undefined,
    dataConsulta: new Date(row.data_consulta).toISOString(),
    layoutVersion: row.layout_version ?? undefined,
    situacao: row.situacao,
    xmlSha256: row.xml_sha256,
    storagePath: row.storage_path,
    payloadJson: row.payload_json ?? undefined,
    retificacaoDe: row.retificacao_de ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export class PostgresStore implements DataStore {
  private pool: pg.Pool;
  private locks = new Set<string>();

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
      max: 5,
    });
  }

  async createConsulta(
    input: Omit<ConsultaRecord, "id" | "startedAt"> & { id?: string },
  ) {
    const id = input.id ?? randomUUID();
    const { rows } = await this.pool.query(
      `INSERT INTO esocial_consultas
        (id, company_id, ambiente, event_type, status, cd_resposta, desc_resposta, error_code, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        id,
        input.companyId,
        input.ambiente,
        input.eventType,
        input.status,
        input.cdResposta ?? null,
        input.descResposta ?? null,
        input.errorCode ?? null,
        input.errorMessage ?? null,
      ],
    );
    return toConsulta(rows[0]);
  }

  async updateConsulta(id: string, patch: Partial<ConsultaRecord>) {
    const current = await this.pool.query(`SELECT * FROM esocial_consultas WHERE id = $1`, [
      id,
    ]);
    if (!current.rows[0]) return null;
    const cur = toConsulta(current.rows[0]);
    const next = { ...cur, ...patch, id: cur.id };
    const { rows } = await this.pool.query(
      `UPDATE esocial_consultas SET
        status = $2,
        cd_resposta = $3,
        desc_resposta = $4,
        error_code = $5,
        error_message = $6,
        finished_at = $7
       WHERE id = $1
       RETURNING *`,
      [
        id,
        next.status,
        next.cdResposta ?? null,
        next.descResposta ?? null,
        next.errorCode ?? null,
        next.errorMessage ?? null,
        next.finishedAt ?? null,
      ],
    );
    return rows[0] ? toConsulta(rows[0]) : null;
  }

  async getConsulta(id: string, companyId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM esocial_consultas WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    return rows[0] ? toConsulta(rows[0]) : null;
  }

  async listConsultas(companyId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM esocial_consultas WHERE company_id = $1 ORDER BY started_at DESC`,
      [companyId],
    );
    return rows.map(toConsulta);
  }

  async addIdentificadores(rowsInput: Omit<IdentificadorRecord, "id" | "createdAt">[]) {
    if (rowsInput.length === 0) return [];
    const created: IdentificadorRecord[] = [];
    for (const r of rowsInput) {
      const { rows } = await this.pool.query(
        `INSERT INTO esocial_identificadores
          (id, consulta_id, company_id, event_type, event_id, nr_recibo)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (company_id, event_id) DO UPDATE SET
           consulta_id = EXCLUDED.consulta_id,
           nr_recibo = COALESCE(EXCLUDED.nr_recibo, esocial_identificadores.nr_recibo)
         RETURNING *`,
        [randomUUID(), r.consultaId, r.companyId, r.eventType, r.eventId, r.nrRecibo ?? null],
      );
      created.push(toIdentificador(rows[0]));
    }
    return created;
  }

  async listIdentificadores(consultaId: string, companyId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM esocial_identificadores WHERE consulta_id = $1 AND company_id = $2`,
      [consultaId, companyId],
    );
    return rows.map(toIdentificador);
  }

  async upsertEvento(row: Omit<EventoRecord, "id" | "createdAt"> & { id?: string }) {
    const existing = await this.pool.query(
      `SELECT * FROM esocial_eventos
       WHERE company_id = $1 AND event_id = $2 AND xml_sha256 = $3
       LIMIT 1`,
      [row.companyId, row.eventId, row.xmlSha256],
    );
    if (existing.rows[0]) return toEvento(existing.rows[0]);

    const { rows } = await this.pool.query(
      `INSERT INTO esocial_eventos
        (id, company_id, consulta_id, ambiente, origem, event_type, event_id, nr_recibo,
         data_recepcao, data_consulta, layout_version, situacao, xml_sha256, storage_path,
         payload_json, retificacao_de)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        row.id ?? randomUUID(),
        row.companyId,
        row.consultaId ?? null,
        row.ambiente,
        row.origem,
        row.eventType,
        row.eventId,
        row.nrRecibo ?? null,
        row.dataRecepcao ?? null,
        row.dataConsulta,
        row.layoutVersion ?? null,
        row.situacao,
        row.xmlSha256,
        row.storagePath,
        row.payloadJson ? JSON.stringify(row.payloadJson) : null,
        row.retificacaoDe ?? null,
      ],
    );
    return toEvento(rows[0]);
  }

  async listEventos(companyId: string, eventType?: string) {
    const { rows } = eventType
      ? await this.pool.query(
          `SELECT * FROM esocial_eventos WHERE company_id = $1 AND event_type = $2`,
          [companyId, eventType],
        )
      : await this.pool.query(`SELECT * FROM esocial_eventos WHERE company_id = $1`, [
          companyId,
        ]);
    return rows.map(toEvento);
  }

  async getEvento(companyId: string, eventoId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM esocial_eventos WHERE id = $1 AND company_id = $2`,
      [eventoId, companyId],
    );
    return rows[0] ? toEvento(rows[0]) : null;
  }

  async getQuota(companyId: string, day: string) {
    const { rows } = await this.pool.query(
      `SELECT acessos FROM esocial_quota WHERE company_id = $1 AND day = $2::date`,
      [companyId, day],
    );
    return rows[0]?.acessos ?? 0;
  }

  async incrementQuota(companyId: string, day: string) {
    const { rows } = await this.pool.query(
      `INSERT INTO esocial_quota (company_id, day, acessos)
       VALUES ($1, $2::date, 1)
       ON CONFLICT (company_id, day)
       DO UPDATE SET acessos = esocial_quota.acessos + 1
       RETURNING acessos`,
      [companyId, day],
    );
    return rows[0].acessos as number;
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
    await this.pool.query(
      `INSERT INTO audit_logs (id, company_id, subject, action, meta)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        randomUUID(),
        typeof meta.companyId === "string" ? meta.companyId : null,
        typeof meta.subject === "string" ? meta.subject : null,
        action,
        JSON.stringify(meta),
      ],
    );
    logger.info({ action, companyId: meta.companyId }, "audit");
  }

  async ping(): Promise<boolean> {
    const { rows } = await this.pool.query("SELECT 1 AS ok");
    return rows[0]?.ok === 1;
  }
}

export async function createPostgresStore(): Promise<PostgresStore | null> {
  const env = getEnv();
  if (!env.DATABASE_URL) return null;
  const store = new PostgresStore(env.DATABASE_URL);
  try {
    await store.ping();
    logger.info("PostgresStore conectado via DATABASE_URL");
    return store;
  } catch (err) {
    logger.error({ err }, "Falha ao conectar DATABASE_URL; usando memória");
    return null;
  }
}
