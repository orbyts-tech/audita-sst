import type { Analise } from "@/features/analises/types";
import type { Empresa } from "@/features/empresas/types";
import type { Escritorio } from "@/features/meus-dados/types";
import type { Notificacao } from "@/features/notificacoes/types";
import type { Solicitacao } from "@/features/solicitacoes/types";
import type { CompanyRole, OrgRole } from "@/lib/auth/permissions";
import { labelOrgRole } from "@/lib/auth/permissions";
import {
  gravarOrganizacaoAtiva,
  lerOrganizacaoAtiva,
} from "@/lib/auth/session";
import { getSupabase, isSupabaseConfigured } from "./client";
import {
  mapAnaliseRow,
  mapCompanyToEmpresa,
  mapEmpresaToCompanyInsert,
  mapNotificationRow,
  mapOrganizationToEscritorio,
  mapPeriodoRow,
  mapSolicitacao,
} from "./mappers";
import type {
  AnaliseRow,
  CompanyRow,
  NotificationRow,
  OrganizationCertificateRow,
  OrganizationRow,
  SolicitacaoPeriodoRow,
  SolicitacaoRow,
} from "./types";

export type MembershipOrg = {
  organizationId: string;
  role: OrgRole;
  razaoSocial: string;
};

export type BootstrapData = {
  organizationId: string | null;
  orgRole: OrgRole | null;
  memberships: MembershipOrg[];
  usuarioNome: string;
  usuarioPapel: string;
  escritorio: Escritorio | null;
  empresas: Empresa[];
  companyRoles: Record<string, CompanyRole>;
  solicitacoes: Solicitacao[];
  analises: Analise[];
  notificacoes: Notificacao[];
};

function emptyBootstrap(partial?: Partial<BootstrapData>): BootstrapData {
  return {
    organizationId: null,
    orgRole: null,
    memberships: [],
    usuarioNome: "",
    usuarioPapel: "Sem organização",
    escritorio: null,
    empresas: [],
    companyRoles: {},
    solicitacoes: [],
    analises: [],
    notificacoes: [],
    ...partial,
  };
}

export async function loadBootstrap(userId: string): Promise<BootstrapData> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado.");
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email, papel")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const { data: memberRows, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, razao_social)")
    .eq("user_id", userId);
  if (memberError) throw memberError;

  const memberships: MembershipOrg[] = (memberRows ?? []).map((row) => {
    const org = row.organizations as
      | { id: string; razao_social: string }
      | { id: string; razao_social: string }[]
      | null;
    const orgRow = Array.isArray(org) ? org[0] : org;
    return {
      organizationId: row.organization_id as string,
      role: row.role as OrgRole,
      razaoSocial: orgRow?.razao_social ?? "Organização",
    };
  });

  if (memberships.length === 0) {
    return emptyBootstrap({
      usuarioNome:
        profile?.full_name ||
        profile?.email?.split("@")[0] ||
        "Usuário",
      usuarioPapel: "Sem organização",
    });
  }

  const preferred = lerOrganizacaoAtiva();
  const active =
    memberships.find((m) => m.organizationId === preferred) ?? memberships[0];
  gravarOrganizacaoAtiva(active.organizationId);

  const organizationId = active.organizationId;
  const orgRole = active.role;
  const isOrgAdmin = orgRole === "owner" || orgRole === "admin";

  const [
    orgRes,
    certRes,
    companiesRes,
    accessRes,
    solicitacoesRes,
    periodosRes,
    analisesRes,
    notificationsRes,
  ] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", organizationId).single(),
    supabase
      .from("organization_certificates")
      .select("*")
      .eq("organization_id", organizationId)
      .order("enviado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    isOrgAdmin
      ? supabase
          .from("companies")
          .select("*")
          .eq("organization_id", organizationId)
          .order("atualizado_em", { ascending: false })
      : supabase
          .from("companies")
          .select("*, company_access!inner(role)")
          .eq("organization_id", organizationId)
          .eq("company_access.user_id", userId)
          .order("atualizado_em", { ascending: false }),
    supabase
      .from("company_access")
      .select("company_id, role")
      .eq("user_id", userId),
    supabase.from("solicitacoes").select("*").order("atualizado_em", { ascending: false }),
    supabase.from("solicitacao_periodos").select("*"),
    supabase.from("analises").select("*").order("atualizado_em", { ascending: false }),
    supabase
      .from("notifications")
      .select("*")
      .eq("organization_id", organizationId)
      .order("criada_em", { ascending: false }),
  ]);

  if (orgRes.error) throw orgRes.error;
  if (companiesRes.error) throw companiesRes.error;
  if (accessRes.error) throw accessRes.error;
  if (solicitacoesRes.error) throw solicitacoesRes.error;
  if (periodosRes.error) throw periodosRes.error;
  if (analisesRes.error) throw analisesRes.error;
  if (notificationsRes.error) throw notificationsRes.error;

  const empresas = ((companiesRes.data ?? []) as CompanyRow[]).map(mapCompanyToEmpresa);
  const companyIds = new Set(empresas.map((e) => e.id));
  const companyRoles: Record<string, CompanyRole> = {};
  for (const row of accessRes.data ?? []) {
    if (companyIds.has(row.company_id as string)) {
      companyRoles[row.company_id as string] = row.role as CompanyRole;
    }
  }

  const periodosBySol = new Map<string, ReturnType<typeof mapPeriodoRow>[]>();
  for (const row of (periodosRes.data ?? []) as SolicitacaoPeriodoRow[]) {
    const list = periodosBySol.get(row.solicitacao_id) ?? [];
    list.push(mapPeriodoRow(row));
    periodosBySol.set(row.solicitacao_id, list);
  }

  const solicitacoes = ((solicitacoesRes.data ?? []) as SolicitacaoRow[])
    .filter((s) => companyIds.has(s.company_id))
    .map((s) => mapSolicitacao(s, periodosBySol.get(s.id) ?? []));

  return {
    organizationId,
    orgRole,
    memberships,
    usuarioNome:
      profile?.full_name ||
      profile?.email?.split("@")[0] ||
      "Usuário",
    usuarioPapel: labelOrgRole(orgRole),
    escritorio: mapOrganizationToEscritorio(
      orgRes.data as OrganizationRow,
      (certRes.data as OrganizationCertificateRow | null) ?? null,
    ),
    empresas,
    companyRoles,
    solicitacoes,
    analises: ((analisesRes.data ?? []) as AnaliseRow[])
      .filter((a) => companyIds.has(a.company_id))
      .map(mapAnaliseRow),
    notificacoes: ((notificationsRes.data ?? []) as NotificationRow[]).map(
      mapNotificationRow,
    ),
  };
}

export async function createOrganizationOnboarding(input: {
  razaoSocial: string;
  cnpj?: string;
  email?: string;
}): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      razao_social: input.razaoSocial,
      cnpj: input.cnpj || null,
      email: input.email || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  gravarOrganizacaoAtiva(data.id as string);
  return data.id as string;
}

export async function insertEmpresa(
  organizationId: string,
  empresa: Empresa,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from("companies")
    .insert(mapEmpresaToCompanyInsert(empresa, organizationId));
  if (error) throw error;
}

export async function updateEmpresa(empresa: Empresa): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from("companies")
    .update({
      razao_social: empresa.razaoSocial,
      email: empresa.email,
      segmento: empresa.segmento,
      grupo_esocial: empresa.grupoEsocial,
      tipo_acesso: empresa.tipoAcesso,
      passivo_estimado: empresa.passivoEstimado,
      status: empresa.status,
      cobertura_esocial: empresa.coberturaEsocial,
      situacao_extracao: empresa.situacaoExtracao,
      ultima_importacao_em: empresa.ultimaImportacaoEm ?? null,
      atualizado_em: empresa.atualizadoEm,
    })
    .eq("id", empresa.id);
  if (error) throw error;
}

export async function insertAnalise(analise: Analise): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("analises").insert({
    id: analise.id,
    company_id: analise.empresaId,
    titulo: analise.titulo,
    status: analise.status,
    passivo_estimado: analise.passivoEstimado,
    progresso: analise.progresso,
    resumo: analise.resumo ?? null,
    atualizado_em: analise.atualizadoEm,
  });
  if (error) throw error;
}

export async function insertNotification(
  organizationId: string,
  notificacao: Notificacao,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("notifications").insert({
    id: notificacao.id,
    organization_id: organizationId,
    titulo: notificacao.titulo,
    mensagem: notificacao.mensagem,
    href: notificacao.href ?? null,
    lida: notificacao.lida,
    criada_em: notificacao.criadaEm,
  });
  if (error) throw error;
}

export async function upsertSolicitacao(sol: Solicitacao): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("solicitacoes").upsert({
    id: sol.id,
    company_id: sol.empresaId,
    modo: sol.modo,
    status: sol.status,
    a_partir_de: sol.aPartirDe ?? null,
    relatorio_parcial: sol.relatorioParcial,
    relatorio_disponivel: sol.relatorioDisponivel,
    log_erro: sol.logErro ?? null,
    ultima_atualizacao_dados_em: sol.ultimaAtualizacaoDadosEm ?? null,
    criado_em: sol.criadoEm,
    atualizado_em: sol.atualizadoEm,
  });
  if (error) throw error;

  const { error: deleteError } = await supabase
    .from("solicitacao_periodos")
    .delete()
    .eq("solicitacao_id", sol.id);
  if (deleteError) throw deleteError;

  if (sol.periodos.length === 0) return;

  const { error: periodosError } = await supabase.from("solicitacao_periodos").insert(
    sol.periodos.map((p) => ({
      id: p.id,
      solicitacao_id: sol.id,
      competencia: p.competencia,
      status: p.status,
    })),
  );
  if (periodosError) throw periodosError;
}

export async function updateEscritorio(
  organizationId: string,
  escritorio: Escritorio,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("organizations")
    .update({
      razao_social: escritorio.razaoSocial,
      cnpj: escritorio.cnpj || null,
      email: escritorio.email || null,
    })
    .eq("id", organizationId);
  if (error) throw error;

  if (!escritorio.certificadoA1) return;

  const { error: certError } = await supabase.from("organization_certificates").insert({
    organization_id: organizationId,
    nome_arquivo: escritorio.certificadoA1.nomeArquivo,
    validade_ate: escritorio.certificadoA1.validadeAte ?? null,
    enviado_em: escritorio.certificadoA1.enviadoEm,
  });
  if (certError) throw certError;
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("notifications").update({ lida: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(organizationId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from("notifications")
    .update({ lida: true })
    .eq("organization_id", organizationId)
    .eq("lida", false);
  if (error) throw error;
}
