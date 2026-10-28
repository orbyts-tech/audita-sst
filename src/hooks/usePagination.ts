import { useEffect, useMemo, useState } from "react";
import { PAGE_SIZE, paginar } from "@/lib/pagination";

/** Pagina uma lista em memória. Volta à página 1 quando `resetKey` muda (busca/filtros). */
export function usePagination<T>(items: T[], resetKey: string | number, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const resultado = useMemo(() => paginar(items, page, pageSize), [items, page, pageSize]);

  useEffect(() => {
    if (page !== resultado.page) setPage(resultado.page);
  }, [page, resultado.page]);

  return {
    ...resultado,
    setPage,
  };
}
