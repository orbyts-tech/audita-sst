import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { NotificacoesPanel } from "@/features/notificacoes/NotificacoesPanel";

export type Usuario = { nome: string; papel: string; fotoUrl?: string };

export function Topbar({
  usuario,
  notificacoesNaoLidas = 0,
  onAbrirMenu,
  onSair,
}: {
  usuario: Usuario;
  notificacoesNaoLidas?: number;
  onAbrirMenu: () => void;
  onSair: () => void;
}) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [notifAberto, setNotifAberto] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAberto && !notifAberto) return;
    const fechar = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuAberto && menuRef.current && !menuRef.current.contains(t)) {
        setMenuAberto(false);
      }
      if (notifAberto && notifRef.current && !notifRef.current.contains(t)) {
        setNotifAberto(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [menuAberto, notifAberto]);

  return (
    <header className="flex h-16 items-center justify-between gap-3 bg-surface-0/70 px-3 shadow-topbar backdrop-blur sm:h-[92px] sm:gap-6 sm:px-6 md:px-8">
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full text-navy-900 hover:bg-blue-100 lg:hidden"
        aria-label="Abrir menu de navegação"
        onClick={onAbrirMenu}
      >
        <Menu aria-hidden className="size-6" strokeWidth={1.8} />
      </button>

      <div className="flex items-center justify-end gap-2 sm:gap-6 ml-auto">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="relative inline-flex size-11 items-center justify-center rounded-full text-navy-900 hover:bg-blue-100"
            aria-label={
              notificacoesNaoLidas > 0
                ? `Notificações: ${notificacoesNaoLidas} não lidas`
                : "Notificações"
            }
            aria-expanded={notifAberto}
            onClick={() => {
              setNotifAberto((v) => !v);
              setMenuAberto(false);
            }}
          >
            <Bell aria-hidden className="size-6" strokeWidth={1.8} />
            {notificacoesNaoLidas > 0 && (
              <span
                aria-hidden
                className="absolute top-2 right-2.5 size-2.5 rounded-full bg-danger-600 ring-2 ring-surface-0"
              />
            )}
          </button>
          <NotificacoesPanel open={notifAberto} onClose={() => setNotifAberto(false)} />
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl py-1.5 pr-2 pl-1.5 text-left hover:bg-blue-100 sm:gap-3"
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            aria-controls={menuId}
            onClick={() => {
              setMenuAberto((v) => !v);
              setNotifAberto(false);
            }}
          >
            {usuario.fotoUrl ? (
              <img src={usuario.fotoUrl} alt="" className="size-10 rounded-full object-cover sm:size-11" />
            ) : (
              <span
                aria-hidden
                className="inline-flex size-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 sm:size-11"
              >
                {usuario.nome.charAt(0)}
              </span>
            )}
            <span className="hidden flex-col sm:flex">
              <span className="text-base leading-5 font-semibold text-navy-900">{usuario.nome}</span>
              <span className="text-[13px] leading-[18px] text-ink-muted">{usuario.papel}</span>
            </span>
            <ChevronDown aria-hidden className="size-5 text-ink-muted sm:ml-2" />
          </button>

          {menuAberto && (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 z-20 mt-2 min-w-[180px] rounded-md border border-border bg-surface-0 py-1 shadow-card"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm font-medium text-navy-900 hover:bg-surface-50"
                onClick={() => {
                  setMenuAberto(false);
                  navigate("/configuracoes");
                }}
              >
                Meu perfil
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm font-medium text-navy-900 hover:bg-surface-50"
                onClick={() => {
                  setMenuAberto(false);
                  onSair();
                }}
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
