import { cn } from "@/lib/cn";
import { iniciais } from "@/lib/format";

/** Pares fundo/texto do design system, todos com contraste ≥ 4,5:1. */
const PALETA = [
  "bg-blue-100 text-blue-700",
  "bg-orange-100 text-orange-700",
  "bg-violet-100 text-violet-600",
  "bg-success-100 text-success-600",
  "bg-danger-100 text-danger-600",
] as const;

/** A cor sai do id, então a mesma empresa tem sempre a mesma cor. */
function corPorId(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETA[h % PALETA.length];
}

export function InitialsAvatar({
  id,
  nome,
  size = 48,
  className,
}: {
  id: string;
  nome: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-base font-bold",
        corPorId(id),
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
