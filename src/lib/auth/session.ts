const AUTH_KEY = "audita-sst-session";
const LOCK_KEY = "audita-sst-login-lock";

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

export function lerSessaoAtiva(): boolean {
  try {
    const token = sessionStorage.getItem(AUTH_KEY);
    return Boolean(token && token.length >= 32);
  } catch {
    return false;
  }
}

export function gravarSessao(): void {
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
      : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  try {
    sessionStorage.setItem(AUTH_KEY, token);
    sessionStorage.removeItem(LOCK_KEY);
  } catch {
    /* private mode */
  }
}

export function limparSessao(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
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

export function registrarSucessoLogin(): void {
  gravarSessao();
}
