const LOCK_KEY = "audita-sst-login-lock";
const ACTIVE_ORG_KEY = "audita-sst-active-org";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

type LockState = { fails: number; until?: number };

function lerLock(): LockState {
  try {
    const raw = sessionStorage.getItem(LOCK_KEY);
    if (!raw) return { fails: 0 };
    return JSON.parse(raw) as LockState;
  } catch {
    return { fails: 0 };
  }
}

function gravarLock(state: LockState) {
  try {
    sessionStorage.setItem(LOCK_KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

export function statusBloqueioLogin(): { bloqueado: boolean; restanteSegundos: number } {
  const lock = lerLock();
  if (lock.until && Date.now() < lock.until) {
    return {
      bloqueado: true,
      restanteSegundos: Math.ceil((lock.until - Date.now()) / 1000),
    };
  }
  return { bloqueado: false, restanteSegundos: 0 };
}

export function registrarFalhaLogin(): { bloqueado: boolean; restanteSegundos: number } {
  const lock = lerLock();
  const fails = (lock.fails || 0) + 1;
  if (fails >= MAX_ATTEMPTS) {
    const until = Date.now() + LOCK_MS;
    gravarLock({ fails, until });
    return { bloqueado: true, restanteSegundos: Math.ceil(LOCK_MS / 1000) };
  }
  gravarLock({ fails });
  return { bloqueado: false, restanteSegundos: 0 };
}

export function limparBloqueioLogin(): void {
  try {
    sessionStorage.removeItem(LOCK_KEY);
  } catch {
    /* private mode */
  }
}

export function lerOrganizacaoAtiva(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ORG_KEY);
  } catch {
    return null;
  }
}

export function gravarOrganizacaoAtiva(organizationId: string | null): void {
  try {
    if (!organizationId) localStorage.removeItem(ACTIVE_ORG_KEY);
    else localStorage.setItem(ACTIVE_ORG_KEY, organizationId);
  } catch {
    /* private mode */
  }
}

export function limparPreferenciasSessao(): void {
  limparBloqueioLogin();
  gravarOrganizacaoAtiva(null);
}
