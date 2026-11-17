import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Usuario } from "@/components/layout/Topbar";
import { ANALISES_MOCK } from "@/features/analises/mock";
import type { Analise } from "@/features/analises/types";
import { EMPRESAS_MOCK } from "@/features/empresas/mock";
import type { Empresa } from "@/features/empresas/types";
import type { Escritorio } from "@/features/meus-dados/types";
import { NOTIFICACOES_MOCK } from "@/features/notificacoes/mock";
import type { Notificacao } from "@/features/notificacoes/types";
import { criarEmpresaFromInput } from "@/domain/empresas/createEmpresa";
import {
  aplicarTickPipeline,
  isStatusTerminal,
} from "@/domain/solicitacoes/transitions";
import {
  limparSessao,
  lerSessaoAtiva,
  registrarFalhaLogin,
  registrarSucessoLogin,
  statusBloqueioLogin,
} from "@/lib/auth/session";
import { toSafeInternalHref } from "@/lib/security/safeHref";
import { isValidEntityId } from "@/lib/security/entityId";
import { sanitizeFileName } from "@/lib/security/sanitizeFileName";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  insertAnalise,
  insertEmpresa,
  insertNotification,
  loadBootstrap,
  markAllNotificationsRead,
  markNotificationRead,
  updateEmpresa,
  updateEscritorio,
  upsertSolicitacao,
} from "@/lib/supabase/repository";
import {
  loginSchema,
  novaEmpresaSchema,
  type NovaEmpresaInput,
} from "@/lib/validation/schemas";
import { SOLICITACOES_MOCK } from "@/features/solicitacoes/mock";
import type { Solicitacao } from "@/features/solicitacoes/types";

const USUARIO_PADRAO: Usuario = {
  nome: "Carlos Silva",
  papel: "Administrador",
};

const ESCRITORIO_PADRAO: Escritorio = {
  razaoSocial: "GSO Saúde Ocupacional Ltda.",
  cnpj: "11222333000181",
  email: "comercial@gso.example",
};

type AppContextValue = {
  autenticado: boolean;
  usuario: Usuario;
  login: (email: string, senha: string) => { ok: true } | { ok: false; erro: string };
  logout: () => void;
  atualizarPerfil: (dados: Partial<Usuario>) => void;
  escritorio: Escritorio;
  atualizarEscritorio: (dados: Partial<Escritorio>) => void;
  enviarCertificadoA1: (nomeArquivo: string) => void;
  empresas: Empresa[];
  adicionarEmpresa: (dados: NovaEmpresaInput) => Empresa;
  obterEmpresa: (id: string) => Empresa | undefined;
  solicitacoes: Solicitacao[];
  obterSolicitacao: (id: string) => Solicitacao | undefined;
  obterSolicitacaoDaEmpresa: (empresaId: string) => Solicitacao | undefined;
  criarSolicitacao: (empresaId: string, aPartirDe?: string) => Solicitacao | { erro: string };
  atualizarDados: (solicitacaoId: string) => void;
  gerarRelatorioAgora: (solicitacaoId: string) => void;
  cancelarSolicitacao: (solicitacaoId: string) => void;
  reiniciarSolicitacao: (solicitacaoId: string) => void;
  analises: Analise[];
  obterAnalisesDaEmpresa: (empresaId: string) => Analise[];
  obterAnalise: (id: string) => Analise | undefined;
  notificacoes: Notificacao[];
  naoLidas: number;
  marcarNotificacaoLida: (id: string) => void;
  marcarTodasLidas: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function agoraIso() {
  return new Date().toISOString();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(lerSessaoAtiva);
  const [usuario, setUsuario] = useState<Usuario>(USUARIO_PADRAO);
  const [escritorio, setEscritorio] = useState<Escritorio>(ESCRITORIO_PADRAO);
  const [empresas, setEmpresas] = useState<Empresa[]>(
    isSupabaseConfigured ? [] : EMPRESAS_MOCK,
  );
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>(
    isSupabaseConfigured ? [] : SOLICITACOES_MOCK,
  );
  const [analises, setAnalises] = useState<Analise[]>(
    isSupabaseConfigured ? [] : ANALISES_MOCK,
  );
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(
    isSupabaseConfigured ? [] : NOTIFICACOES_MOCK,
  );
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const timers = useRef<Record<string, number>>({});
  const persistEnabled = isSupabaseConfigured && Boolean(organizationId);

  const persistSolicitacao = useCallback(
    (sol: Solicitacao) => {
      if (!persistEnabled) return;
      void upsertSolicitacao(sol).catch((err) => {
        console.error("Falha ao persistir solicitação", err);
      });
    },
    [persistEnabled],
  );

  const patchSolicitacao = useCallback(
    (id: string, updater: (s: Solicitacao) => Solicitacao) => {
      setSolicitacoes((lista) => {
        const next = lista.map((s) => {
          if (s.id !== id) return s;
          const updated = updater(s);
          persistSolicitacao(updated);
          return updated;
        });
        return next;
      });
    },
    [persistSolicitacao],
  );

  const avancarPipeline = useCallback(
    (id: string) => {
      if (timers.current[id]) window.clearTimeout(timers.current[id]);

      const tick = () => {
        setSolicitacoes((lista) => {
          const atual = lista.find((s) => s.id === id);
          if (!atual || isStatusTerminal(atual.status)) return lista;

          const atualizada = aplicarTickPipeline(atual, agoraIso());
          if (!atualizada) return lista;

          persistSolicitacao(atualizada);

          if (!isStatusTerminal(atualizada.status)) {
            timers.current[id] = window.setTimeout(tick, 2200);
          }
          return lista.map((s) => (s.id === id ? atualizada : s));
        });
      };

      timers.current[id] = window.setTimeout(tick, 1800);
    },
    [persistSolicitacao],
  );

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    void (async () => {
      try {
        const data = await loadBootstrap();
        if (cancelled || !data) return;
        setOrganizationId(data.organizationId);
        setEscritorio(data.escritorio);
        setEmpresas(data.empresas);
        setSolicitacoes(data.solicitacoes);
        setAnalises(data.analises);
        setNotificacoes(data.notificacoes);
      } catch (err) {
        console.error("Falha ao carregar Supabase — usando mocks locais", err);
        if (!cancelled) {
          setEmpresas(EMPRESAS_MOCK);
          setSolicitacoes(SOLICITACOES_MOCK);
          setAnalises(ANALISES_MOCK);
          setNotificacoes(NOTIFICACOES_MOCK);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((email: string, senha: string) => {
    const bloqueio = statusBloqueioLogin();
    if (bloqueio.bloqueado) {
      return {
        ok: false as const,
        erro: `Muitas tentativas. Aguarde ${bloqueio.restanteSegundos}s.`,
      };
    }

    const parsed = loginSchema.safeParse({ email, senha });
    if (!parsed.success) {
      const falha = registrarFalhaLogin();
      if (falha.bloqueado) {
        return {
          ok: false as const,
          erro: `Muitas tentativas. Aguarde ${falha.restanteSegundos}s.`,
        };
      }
      return {
        ok: false as const,
        erro: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      };
    }

    // MVP demo: formato válido autentica (sem API). Token opaco em sessionStorage.
    registrarSucessoLogin();
    setAutenticado(true);
    setUsuario((u) => ({ ...u, nome: parsed.data.email.split("@")[0] || u.nome }));
    return { ok: true as const };
  }, []);

  const logout = useCallback(() => {
    limparSessao();
    setAutenticado(false);
  }, []);

  const atualizarPerfil = useCallback((dados: Partial<Usuario>) => {
    setUsuario((u) => ({ ...u, ...dados }));
  }, []);

  const atualizarEscritorio = useCallback(
    (dados: Partial<Escritorio>) => {
      setEscritorio((e) => {
        const next = { ...e, ...dados };
        if (organizationId) {
          void updateEscritorio(organizationId, next).catch((err) => {
            console.error("Falha ao persistir escritório", err);
          });
        }
        return next;
      });
    },
    [organizationId],
  );

  const enviarCertificadoA1 = useCallback(
    (nomeArquivo: string) => {
      const nomeSeguro = sanitizeFileName(nomeArquivo);
      setEscritorio((e) => {
        const next: Escritorio = {
          ...e,
          certificadoA1: {
            nomeArquivo: nomeSeguro,
            validadeAte: "2027-12-31",
            enviadoEm: agoraIso(),
          },
        };
        if (organizationId) {
          void updateEscritorio(organizationId, next).catch((err) => {
            console.error("Falha ao persistir certificado", err);
          });
        }
        return next;
      });
    },
    [organizationId],
  );

  const adicionarEmpresa = useCallback(
    (dados: NovaEmpresaInput) => {
      const parsed = novaEmpresaSchema.parse(dados);
      const agora = agoraIso();
      const empresa = criarEmpresaFromInput(parsed, agora, crypto.randomUUID());
      const analise: Analise = {
        id: crypto.randomUUID(),
        empresaId: empresa.id,
        titulo: `Auditoria SST — ${empresa.razaoSocial}`,
        status: "pendente",
        passivoEstimado: 0,
        progresso: 0,
        atualizadoEm: agora,
        resumo: "Empresa cadastrada. Crie uma solicitação para extrair o eSocial.",
      };
      const notificacao: Notificacao = {
        id: crypto.randomUUID(),
        titulo: "Nova empresa cadastrada",
        mensagem: `${empresa.razaoSocial} pronta para solicitação automática.`,
        criadaEm: agora,
        lida: false,
        href: toSafeInternalHref(`/empresas/${empresa.id}`) ?? undefined,
      };
      setEmpresas((lista) => [empresa, ...lista]);
      setAnalises((lista) => [analise, ...lista]);
      setNotificacoes((lista) => [notificacao, ...lista]);

      if (organizationId) {
        void (async () => {
          try {
            await insertEmpresa(organizationId, empresa);
            await insertAnalise(analise);
            await insertNotification(organizationId, notificacao);
          } catch (err) {
            console.error("Falha ao persistir empresa", err);
          }
        })();
      }
      return empresa;
    },
    [organizationId],
  );

  const obterEmpresa = useCallback(
    (id: string) => (isValidEntityId(id) ? empresas.find((e) => e.id === id) : undefined),
    [empresas],
  );

  const obterSolicitacao = useCallback(
    (id: string) =>
      isValidEntityId(id) ? solicitacoes.find((s) => s.id === id) : undefined,
    [solicitacoes],
  );

  const obterSolicitacaoDaEmpresa = useCallback(
    (empresaId: string) =>
      solicitacoes.find(
        (s) => s.empresaId === empresaId && s.status !== "cancelado",
      ),
    [solicitacoes],
  );

  const criarSolicitacao = useCallback(
    (empresaId: string, aPartirDe?: string) => {
      if (!isValidEntityId(empresaId)) {
        return { erro: "Empresa inválida." };
      }
      const existente = solicitacoes.find(
        (s) => s.empresaId === empresaId && s.status !== "cancelado",
      );
      if (existente) {
        return { erro: "Já existe uma solicitação ativa para esta empresa. Use Atualizar dados." };
      }
      const competencia =
        aPartirDe && /^\d{4}-(0[1-9]|1[0-2])$/.test(aPartirDe) ? aPartirDe : undefined;
      const agora = agoraIso();
      const sol: Solicitacao = {
        id: crypto.randomUUID(),
        empresaId,
        modo: "automatico",
        status: "criado",
        aPartirDe: competencia,
        criadoEm: agora,
        atualizadoEm: agora,
        relatorioParcial: false,
        relatorioDisponivel: false,
        periodos: [
          {
            id: crypto.randomUUID(),
            competencia: competencia || "2024-01",
            status: "pendente",
          },
          { id: crypto.randomUUID(), competencia: "2024-02", status: "pendente" },
        ],
      };
      setSolicitacoes((lista) => [sol, ...lista]);
      setEmpresas((lista) =>
        lista.map((e) => {
          if (e.id !== empresaId) return e;
          const updated: Empresa = {
            ...e,
            situacaoExtracao: "processando",
            atualizadoEm: agora,
          };
          if (organizationId) {
            void updateEmpresa(updated).catch((err) => {
              console.error("Falha ao atualizar empresa", err);
            });
          }
          return updated;
        }),
      );
      persistSolicitacao(sol);
      avancarPipeline(sol.id);
      return sol;
    },
    [solicitacoes, avancarPipeline, organizationId, persistSolicitacao],
  );

  const atualizarDados = useCallback(
    (solicitacaoId: string) => {
      const agora = agoraIso();
      patchSolicitacao(solicitacaoId, (s) => ({
        ...s,
        status: "em_execucao",
        atualizadoEm: agora,
        relatorioParcial: true,
        logErro: undefined,
        periodos: [
          ...s.periodos,
          {
            id: crypto.randomUUID(),
            competencia: new Date().toISOString().slice(0, 7),
            status: "pendente",
          },
        ],
      }));
      avancarPipeline(solicitacaoId);
    },
    [patchSolicitacao, avancarPipeline],
  );

  const gerarRelatorioAgora = useCallback(
    (solicitacaoId: string) => {
      const agora = agoraIso();
      patchSolicitacao(solicitacaoId, (s) => ({
        ...s,
        relatorioDisponivel: true,
        atualizadoEm: agora,
        ultimaAtualizacaoDadosEm: agora,
      }));
    },
    [patchSolicitacao],
  );

  const cancelarSolicitacao = useCallback(
    (solicitacaoId: string) => {
      if (timers.current[solicitacaoId]) {
        window.clearTimeout(timers.current[solicitacaoId]);
        delete timers.current[solicitacaoId];
      }
      patchSolicitacao(solicitacaoId, (s) => ({
        ...s,
        status: "cancelado",
        atualizadoEm: agoraIso(),
      }));
    },
    [patchSolicitacao],
  );

  const reiniciarSolicitacao = useCallback(
    (solicitacaoId: string) => {
      patchSolicitacao(solicitacaoId, (s) => ({
        ...s,
        status: "reiniciado",
        logErro: undefined,
        atualizadoEm: agoraIso(),
        relatorioParcial: false,
      }));
      window.setTimeout(() => {
        patchSolicitacao(solicitacaoId, (s) => ({ ...s, status: "criado" }));
        avancarPipeline(solicitacaoId);
      }, 800);
    },
    [patchSolicitacao, avancarPipeline],
  );

  const obterAnalisesDaEmpresa = useCallback(
    (empresaId: string) => analises.filter((a) => a.empresaId === empresaId),
    [analises],
  );

  const obterAnalise = useCallback(
    (id: string) => analises.find((a) => a.id === id),
    [analises],
  );

  const marcarNotificacaoLida = useCallback(
    (id: string) => {
      setNotificacoes((lista) =>
        lista.map((n) => (n.id === id ? { ...n, lida: true } : n)),
      );
      if (organizationId) {
        void markNotificationRead(id).catch((err) => {
          console.error("Falha ao marcar notificação", err);
        });
      }
    },
    [organizationId],
  );

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes((lista) => lista.map((n) => ({ ...n, lida: true })));
    if (organizationId) {
      void markAllNotificationsRead(organizationId).catch((err) => {
        console.error("Falha ao marcar notificações", err);
      });
    }
  }, [organizationId]);

  const naoLidas = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      autenticado,
      usuario,
      login,
      logout,
      atualizarPerfil,
      escritorio,
      atualizarEscritorio,
      enviarCertificadoA1,
      empresas,
      adicionarEmpresa,
      obterEmpresa,
      solicitacoes,
      obterSolicitacao,
      obterSolicitacaoDaEmpresa,
      criarSolicitacao,
      atualizarDados,
      gerarRelatorioAgora,
      cancelarSolicitacao,
      reiniciarSolicitacao,
      analises,
      obterAnalisesDaEmpresa,
      obterAnalise,
      notificacoes,
      naoLidas,
      marcarNotificacaoLida,
      marcarTodasLidas,
    }),
    [
      autenticado,
      usuario,
      login,
      logout,
      atualizarPerfil,
      escritorio,
      atualizarEscritorio,
      enviarCertificadoA1,
      empresas,
      adicionarEmpresa,
      obterEmpresa,
      solicitacoes,
      obterSolicitacao,
      obterSolicitacaoDaEmpresa,
      criarSolicitacao,
      atualizarDados,
      gerarRelatorioAgora,
      cancelarSolicitacao,
      reiniciarSolicitacao,
      analises,
      obterAnalisesDaEmpresa,
      obterAnalise,
      notificacoes,
      naoLidas,
      marcarNotificacaoLida,
      marcarTodasLidas,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
}
