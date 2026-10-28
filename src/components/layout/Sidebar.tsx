import {
  Building2,
  ClipboardList,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AuditaLogo } from "@/components/brand/AuditaLogo";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/solicitacoes", label: "Solicitações", icon: ClipboardList },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/meus-dados", label: "Meus dados", icon: UserRound },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({
  currentPath,
  className,
  onNavigate,
}: {
  currentPath: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex w-[232px] shrink-0 flex-col rounded-2xl bg-surface-0 px-3 py-6 shadow-card",
        className,
      )}
    >
      <Link
        to="/solicitacoes"
        className="mx-auto mb-8 block"
        aria-label="Audita SST, ir para Solicitações"
        onClick={onNavigate}
      >
        <AuditaLogo />
      </Link>
      <nav aria-label="Principal" className="flex flex-col gap-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const ativo = currentPath === href || currentPath.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              to={href}
              aria-current={ativo ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex h-[52px] items-center gap-3.5 rounded-[10px] px-4 text-base transition-colors",
                ativo
                  ? "bg-blue-100 font-semibold text-blue-600"
                  : "font-medium text-ink-muted hover:bg-surface-50 hover:text-navy-900",
              )}
            >
              <Icon aria-hidden className="size-6" strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
