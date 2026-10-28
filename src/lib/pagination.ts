/** Tamanho padrão alinhado ao contrato da API (`pageSize=20`). */
export const PAGE_SIZE = 20;

export function paginar<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const paginaAtual = Math.min(Math.max(1, page), totalPages);
  const inicio = (paginaAtual - 1) * pageSize;
  return {
    items: items.slice(inicio, inicio + pageSize),
    page: paginaAtual,
    pageSize,
    total,
    totalPages,
    from: total === 0 ? 0 : inicio + 1,
    to: Math.min(inicio + pageSize, total),
  };
}
