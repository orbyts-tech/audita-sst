/**
 * Permite apenas rotas internas relativas (open-redirect / javascript:).
 * Exemplos OK: `/empresas/1`, `/solicitacoes/sol-1`
 * Exemplos bloqueados: `https://evil.com`, `//evil.com`, `javascript:alert(1)`
 */
export function toSafeInternalHref(href: string | undefined | null): string | null {
  if (!href || typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  if (/[\s\\]/.test(trimmed)) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  return trimmed;
}
