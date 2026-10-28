/** IDs de rota/domínio — rejeita path traversal e caracteres inesperados. */
const ENTITY_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export function isValidEntityId(id: string | undefined | null): id is string {
  if (!id || typeof id !== "string") return false;
  if (id.includes("..") || id.includes("/") || id.includes("\\")) return false;
  return ENTITY_ID.test(id);
}

export function assertEntityId(id: string | undefined): string | null {
  return isValidEntityId(id) ? id : null;
}
