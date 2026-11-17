import { getStore } from "../../db/store.js";
import { AppError } from "../../lib/errors.js";

/** Manual v1.16 §7.7 / §7.8 */
export const MAX_ACESSOS_DIA = 10;
export const DIAS_BLOQUEADOS = new Set([1, 2, 3, 4, 5, 6, 7]);
export const MAX_IDS_POR_RETORNO = 50;

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export class QuotaManager {
  assertJanelaCalendario(now = new Date()) {
    const brDay = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
    ).getDate();
    if (DIAS_BLOQUEADOS.has(brDay)) {
      throw new AppError(
        "Consultas/downloads ao eSocial não são permitidos entre os dias 1 e 7 do mês (manual v1.16).",
        "QUOTA_CALENDAR_BLOCK",
        429,
      );
    }
  }

  /** Data fim máxima: agora − 1 hora. */
  maxDataFim(now = new Date()): Date {
    return new Date(now.getTime() - 60 * 60 * 1000);
  }

  async acquireSlot(companyId: string) {
    this.assertJanelaCalendario();
    const store = getStore();
    const locked = await store.tryLockEmployer(companyId);
    if (!locked) {
      throw new AppError(
        "Já existe uma operação eSocial em andamento para este empregador (sem paralelismo).",
        "QUOTA_PARALLEL",
        429,
      );
    }
    const day = todayKey(
      new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })),
    );
    const used = await store.getQuota(companyId, day);
    if (used >= MAX_ACESSOS_DIA) {
      await store.unlockEmployer(companyId);
      throw new AppError(
        "Limite de 10 acessos diários (consulta + download) esgotado para este empregador.",
        "QUOTA_DAILY_EXCEEDED",
        429,
      );
    }
    return {
      day,
      async consume() {
        await store.incrementQuota(companyId, day);
      },
      async release() {
        await store.unlockEmployer(companyId);
      },
    };
  }
}

export const quotaManager = new QuotaManager();
