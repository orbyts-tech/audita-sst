import { forwardRef, type InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Texto para leitores de tela (o campo não tem rótulo visível) */
  label: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { label, className, ...props },
  ref,
) {
  return (
    <label className={cn("relative flex min-w-0 flex-1 items-center", className)}>
      <span className="sr-only">{label}</span>
      <Search aria-hidden className="pointer-events-none absolute left-4 size-5 text-ink-muted" strokeWidth={2} />
      <input
        ref={ref}
        type="search"
        className={cn(
          "h-[52px] w-full rounded-md border border-border bg-surface-0 pr-4 pl-12 text-[15px] text-navy-900",
          "placeholder:text-ink-muted hover:border-border-strong",
          "focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-none",
        )}
        {...props}
      />
    </label>
  );
});
