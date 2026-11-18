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
import type { Analise } from "@/features/analises/types";
import type { Empresa } from "@/features/empresas/types";
import type { Escritorio } from "@/features/meus-dados/types";
import type { Notificacao } from "@/features/notificacoes/types";
import { criarEmpresaFromInput } from "@/domain/empresas/createEmpresa";
import {
  aplicarTickPipeline,
  isStatusTerminal,
} from "@/domain/solicitacoes/transitions";
import {
  type CompanyRole,
  type OrgRole,
  type Permission,
  hasCompanyPermission,
  hasOrgPermission,
} from "@/lib/auth/permissions";
import {
  gravarOrganizacaoAtiva,
  limparPreferenciasSessao,
  registrarFalhaLogin,
  statusBloqueioLogin,
  limparBloqueioLogin,
} from "@/lib/auth/session";
import {
  getCurrentSession,
  onAuthStateChange,
  signInWithPassword,
  signOut,
} from "@/lib/auth/supabaseAuth";
import { toSafeInternalHref } from "@/lib/security/safeHref";
import { isValidEntityId } from "@/lib/security/entityId";
import { sanitizeFileName } from "@/lib/security/sanitizeFileName";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  createOrganizationOnboarding,
  insertAnalise,
  insertEmpresa,
  insertNotification,
  loadBootstrap,
  markAllNotificationsRead,
  markNotificationRead,
  type MembershipOrg,
  updateEmpresa,
  updateEscritorio,
  upsertSolicitacao,
} from "@/lib/supabase/repository";
import {
  loginSchema,
  novaEmpresaSchema,
  type NovaEmpresaInput,
} from "@/lib/validation/schemas";
import type { Solicitacao } from "@/features/solicitacoes/types";

const ESCRITORIO_VAZIO: Escritorio = {
  razaoSocial: "",
  cnpj: "",
  email: "",
};

type AppContextValue = {
  autenticado: boolean;
  sessionLoading: boolean;
  bootstrapLoading: boolean;
  bootstrapError: string | null;
  semOrganizacao: boolean;
  memberships: MembershipOrg[];
  orgRole: OrgRole | null;
  organizationId: string | null;
  companyRoles: Record<string, CompanyRole>;
  can: (permission: Permission, companyId?: string) => boolean;
  usuario: Usuario;
  login: (
    email: string,
    senha: string,
  ) => Promise<{ ok: true } | { ok: false; erro: string }>;
  logout: () => Promise<void>;
  selecionarOrganizacao: (organizationId: string) => Promise<void>;
  criarOrganizacao: (dados: {
    razaoSocial: string;
    cnpj?: string;
    email?: string;
  }) => Promise<{ ok: true } | { ok: false; erro: string }>;
  atualizarPerfil: (dados: Partial<Usuario>) => void;
  escritorio: Escritorio;
  atualizarEscritorio: (dados: Partial<Escritorio>) => void;
  enviarCertificadoA1: (dados: {
    nomeArquivo: string;
    validadeAte?: string;
    subjectCN?: string;
    cnpjBase?: string;
  }) => void;
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

function clearDomainState(setters: {
  setOrganizationId: (v: string | null) => void;
  setOrgRole: (v: OrgRole | null) => void;
  setMemberships: (v: MembershipOrg[]) => void;
  setCompanyRoles: (v: Record<string, CompanyRole>) => void;
  setUsuario: (v: Usuario) => void;
  setEscritorio: (v: Escritorio) => void;
  setEmpresas: (v: Empresa[]) => void;
  setSolicitacoes: (v: Solicitacao[]) => void;
  setAnalises: (v: Analise[]) => void;
  setNotificacoes: (v: Notificacao[]) => void;
  setBootstrapError: (v: string | null) => void;
}) {
  setters.setOrganizationId(null);
  setters.setOrgRole(null);
  setters.setMemberships([]);
  setters.setCompanyRoles({});
  setters.setUsuario({ nome: "", papel: "" });
  setters.setEscritorio(ESCRITORIO_VAZIO);
  setters.setEmpresas([]);
  setters.setSolicitacoes([]);
  setters.setAnalises([]);
  setters.setNotificacoes([]);
  setters.setBootstrapError(null);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [autenticado, setAutenticado] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario>({ nome: "", papel: "" });
  const [escritorio, setEscritorio] = useState<Escritorio>(ESCRITORIO_VAZIO);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<OrgRole | null>(null);
  const [memberships, setMemberships] = useState<MembershipOrg[]>([]);
  const [companyRoles, setCompanyRoles] = useState<Record<string, CompanyRole>>({});
  const timers = useRef<Record<string, number>>({});
  const persistEnabled = isSupabaseConfigured && Boolean(organizationId);

  const clearState = useCallback(() => {
    clearDomainState({
      setOrganizationId,
      setOrgRole,
      setMemberships,
      setCompanyRoles,
      setUsuario,
      setEscritorio,
      setEmpresas,
      setSolicitacoes,
      setAnalises,
      setNotificacoes,
      setBootstrapError,
    });
  }, []);

  const reloadBootstrap = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured) {
      setBootstrapError("Supabase não configurado. Defina VITE_SUPABASE_URL e a publishable key.");
      return;
    }
    setBootstrapLoading(true);
    setBootstrapError(null);
    try {
      const data = await loadBootstrap(uid);
      setOrganizationId(data.organizationId);
      setOrgRole(data.orgRole);
      setMemberships(data.memberships);
      setCompanyRoles(data.companyRoles);
      setUsuario({ nome: data.usuarioNome, papel: data.usuarioPapel });
      setEscritorio(data.escritorio ?? ESCRITORIO_VAZIO);
      setEmpresas(data.empresas);
      setSolicitacoes(data.solicitacoes);
      setAnalises(data.analises);
      setNotificacoes(data.notificacoes);
    } catch (err) {
      console.error("Falha ao carregar dados autorizados", err);
      setBootstrapError(
        err instanceof Error ? err.message : "Falha ao carregar dados da organização.",
      );
      setOrganizationId(null);
      setOrgRole(null);
      setMemberships([]);
      setCompanyRoles({});
      setEmpresas([]);
      setSolicitacoes([]);
      setAnalises([]);
      setNotificacoes([]);
    } finally {
      setBootstrapLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await getCurrentSession();
        if (cancelled) return;
        if (session?.user) {
          setAutenticado(true);
          setUserId(session.user.id);
          await reloadBootstrap(session.user.id);
        } else {
          setAutenticado(false);
          setUserId(null);
          clearState();
        }
      } catch (err) {
        console.error("Falha ao recuperar sessão", err);
        if (!cancelled) {
          setAutenticado(false);
          setUserId(null);
          clearState();
        }
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();

    const unsubscribe = onAuthStateChange(({ session, user }) => {
      if (cancelled) return;
      if (session && user) {
        setAutenticado(true);
        setUserId(user.id);
        void reloadBootstrap(user.id);
      } else {
        setAutenticado(false);
        setUserId(null);
        clearState();
      }
      setSessionLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [clearState, reloadBootstrap]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t));
    };
  }, []);

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
      setSolicitacoes((lista) =>
        lista.map((s) => {
          if (s.id !== id) return s;
          const updated = updater(s);
          persistSolicitacao(updated);
          return updated;
        }),
      );
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

  const login = useCallback(async (email: string, senha: string) => {
    if (!isSupabaseConfigured) {
      return {
        ok: false as const,
        erro: "Supabase Auth não configurado neste ambiente.",
      };
    }

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

    try {
      await signInWithPassword(parsed.data.email, parsed.data.senha);
      limparBloqueioLogin();
      return { ok: true as const };
    } catch (err) {
      const falha = registrarFalhaLogin();
      if (falha.bloqueado) {
        return {
          ok: false as const,
          erro: `Muitas tentativas. Aguarde ${falha.restanteSegundos}s.`,
        };
      }
      return {
        ok: false as const,
        erro: err instanceof Error ? err.message : "Falha na autenticação.",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    Object.values(timers.current).forEach((t) => window.clearTimeout(t));
    timers.current = {};
    limparPreferenciasSessao();
    clearState();
    setAutenticado(false);
    setUserId(null);
    try {
      await signOut();
    } catch (err) {
      console.error("Falha no logout", err);
    }
  }, [clearState]);

  const selecionarOrganizacao = useCallback(
    async (nextOrgId: string) => {
      if (!memberships.some((m) => m.organizationId === nextOrgId)) {
        setBootstrapError("Organização não autorizada.");
        return;
      }
      gravarOrganizacaoAtiva(nextOrgId);
      if (userId) await reloadBootstrap(userId);
    },
    [memberships, reloadBootstrap, userId],
  );

  const criarOrganizacao = useCallback(
    async (dados: { razaoSocial: string; cnpj?: string; email?: string }) => {
      try {
        await createOrganizationOnboarding(dados);
        if (userId) await reloadBootstrap(userId);
        return { ok: true as const };
      } catch (err) {
        return {
          ok: false as const,
          erro: err instanceof Error ? err.message : "Falha ao criar organização.",
        };
      }
    },
    [reloadBootstrap, userId],
  );

  const can = useCallback(
    (permission: Permission, companyId?: string) => {
      if (companyId) {
        return hasCompanyPermission(orgRole, companyRoles[companyId] ?? null, permission);
      }
      return hasOrgPermission(orgRole, permission);
    },
    [orgRole, companyRoles],
  );

  const atualizarPerfil = useCallback((dados: Partial<Usuario>) => {
    setUsuario((u) => ({
      ...u,
      nome: dados.nome ?? u.nome,
      // papel vem do backend/membership — não aceitar elevação pelo cliente
      fotoUrl: dados.fotoUrl ?? u.fotoUrl,
    }));
  }, []);

  const atualizarEscritorio = useCallback(
    (dados: Partial<Escritorio>) => {
      if (!can("org.manage")) return;
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
    [organizationId, can],
  );

  const enviarCertificadoA1 = useCallback(
    (dados: {
      nomeArquivo: string;
      validadeAte?: string;
      subjectCN?: string;
      cnpjBase?: string;
    }) => {
      if (!can("org.certificates.manage")) return;
      const nomeSeguro = sanitizeFileName(dados.nomeArquivo);
      const agora = agoraIso();
      setEscritorio((e) => {
        const next: Escritorio = {
          ...e,
          certificadoA1: {
            nomeArquivo: nomeSeguro,
            validadeAte: dados.validadeAte,
            enviadoEm: agora,
            subjectCN: dados.subjectCN,
            cnpjBase: dados.cnpjBase,
          },
        };
        if (organizationId) {
          void updateEscritorio(organizationId, next).catch((err) => {
            console.error("Falha ao persistir metadados do certificado", err);
          });
        }
        return next;
      });

      const titular = dados.subjectCN ? ` (${dados.subjectCN})` : "";
      const notificacao: Notificacao = {
        id: crypto.randomUUID(),
        titulo: "Certificado A1 válido",
        mensagem: `O certificado ${nomeSeguro}${titular} foi validado com sucesso.`,
        criadaEm: agora,
        lida: false,
        href: toSafeInternalHref("/meus-dados") ?? undefined,
      };
      setNotificacoes((lista) => [notificacao, ...lista]);
      if (organizationId) {
        void insertNotification(organizationId, notificacao).catch((err) => {
          console.error("Falha ao persistir notificação do certificado", err);
        });
      }
    },
    [organizationId, can],
  );

  const adicionarEmpresa = useCallback(
    (dados: NovaEmpresaInput) => {
      if (!can("company.create") || !organizationId) {
        throw new Error("Sem permissão para cadastrar empresas.");
      }
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

      void (async () => {
        try {
          await insertEmpresa(organizationId, empresa);
          await insertAnalise(analise);
          await insertNotification(organizationId, notificacao);
        } catch (err) {
          console.error("Falha ao persistir empresa", err);
        }
      })();
      return empresa;
    },
    [organizationId, can],
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
      if (!can("operations.write", empresaId)) {
        return { erro: "Sem permissão para criar solicitação nesta empresa." };
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
    [solicitacoes, avancarPipeline, organizationId, persistSolicitacao, can],
  );

  const atualizarDados = useCallback(
    (solicitacaoId: string) => {
      const sol = solicitacoes.find((s) => s.id === solicitacaoId);
      if (!sol || !can("operations.write", sol.empresaId)) return;
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
    [patchSolicitacao, avancarPipeline, solicitacoes, can],
  );

  const gerarRelatorioAgora = useCallback(
    (solicitacaoId: string) => {
      const sol = solicitacoes.find((s) => s.id === solicitacaoId);
      if (!sol || !can("operations.write", sol.empresaId)) return;
      const agora = agoraIso();
      patchSolicitacao(solicitacaoId, (s) => ({
        ...s,
        relatorioDisponivel: true,
        atualizadoEm: agora,
        ultimaAtualizacaoDadosEm: agora,
      }));
    },
    [patchSolicitacao, solicitacoes, can],
  );

  const cancelarSolicitacao = useCallback(
    (solicitacaoId: string) => {
      const sol = solicitacoes.find((s) => s.id === solicitacaoId);
      if (!sol || !can("operations.write", sol.empresaId)) return;
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
    [patchSolicitacao, solicitacoes, can],
  );

  const reiniciarSolicitacao = useCallback(
    (solicitacaoId: string) => {
      const sol = solicitacoes.find((s) => s.id === solicitacaoId);
      if (!sol || !can("operations.write", sol.empresaId)) return;
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
    [patchSolicitacao, avancarPipeline, solicitacoes, can],
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
      sessionLoading,
      bootstrapLoading,
      bootstrapError,
      semOrganizacao: autenticado && !bootstrapLoading && !organizationId,
      memberships,
      orgRole,
      organizationId,
      companyRoles,
      can,
      usuario,
      login,
      logout,
      selecionarOrganizacao,
      criarOrganizacao,
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
      sessionLoading,
      bootstrapLoading,
      bootstrapError,
      organizationId,
      memberships,
      orgRole,
      companyRoles,
      can,
      usuario,
      login,
      logout,
      selecionarOrganizacao,
      criarOrganizacao,
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
