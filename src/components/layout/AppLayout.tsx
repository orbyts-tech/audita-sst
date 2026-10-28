import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/app/AppProvider";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout({
  currentPath,
  children,
}: {
  currentPath: string;
  children: ReactNode;
}) {
  const { usuario, naoLidas, logout } = useApp();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    setMenuAberto(false);
  }, [currentPath]);

  useEffect(() => {
    if (!menuAberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuAberto]);

  return (
    <div className="flex min-h-screen gap-0 bg-surface-50 p-2 sm:p-3">
      <Sidebar currentPath={currentPath} className="hidden lg:flex" />

      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-navy-900/40"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
          />
          <Sidebar
            currentPath={currentPath}
            className="absolute top-3 bottom-3 left-3 z-10"
            onNavigate={() => setMenuAberto(false)}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          usuario={usuario}
          notificacoesNaoLidas={naoLidas}
          onAbrirMenu={() => setMenuAberto(true)}
          onSair={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        />
        <main
          className={
            currentPath.includes("/relatorio")
              ? "flex min-h-0 flex-1 flex-col px-4 pt-3 pb-3 sm:px-6 md:px-8"
              : "flex-1 px-4 pt-6 pb-10 sm:px-6 md:px-8 md:pt-10 md:pb-12"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
