import { cn } from "@/lib/cn";

/** Logo vertical oficial Audita SST. */
export function AuditaLogo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/audita-sst-vertical.png"
      alt="Audita SST"
      className={cn("h-[84px] w-auto object-contain", className)}
    />
  );
}
