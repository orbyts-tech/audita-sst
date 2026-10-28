import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-[32px] leading-10 font-extrabold tracking-[-0.01em] text-navy-900 md:text-[44px] md:leading-[52px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-base text-ink-muted md:text-lg">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
