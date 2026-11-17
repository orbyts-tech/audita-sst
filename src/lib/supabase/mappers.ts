import type { Analise } from "@/features/analises/types";
import type { Empresa } from "@/features/empresas/types";
import type { Escritorio } from "@/features/meus-dados/types";
import type { Notificacao } from "@/features/notificacoes/types";
import type {
  PeriodoExtracao,
  Solicitacao,
  StatusSolicitacao,
} from "@/features/solicitacoes/types";
import type { GrupoEsocial, TipoAcessoEsocial } from "@/features/solicitacoes/labels";
import type {
  AnaliseRow,
  CompanyRow,
  NotificationRow,
  OrganizationCertificateRow,
  OrganizationRow,
  SolicitacaoPeriodoRow,
  SolicitacaoRow,
} from "./types";

export function mapOrganizationToEscritorio(
  org: OrganizationRow,
  cert?: OrganizationCertificateRow | null,
): Escritorio {
  return {
    razaoSocial: org.razao_social,
    cnpj: org.cnpj ?? "",
    email: org.email ?? "",
    certificadoA1: cert
      ? {
          nomeArquivo: cert.nome_arquivo,
          validadeAte: cert.validade_ate ?? undefined,
          enviadoEm: cert.enviado_em,
        }
      : undefined,
  };
}

export function mapCompanyToEmpresa(row: CompanyRow): Empresa {
  return {
    id: row.id,
    razaoSocial: row.razao_social,
    segmento: row.segmento,
    cnpj: row.cnpj,
    email: row.email,
    grupoEsocial: row.grupo_esocial as GrupoEsocial,
    tipoAcesso: row.tipo_acesso as TipoAcessoEsocial,
    passivoEstimado: Number(row.passivo_estimado) || 0,
    status: row.status,
    atualizadoEm: row.atualizado_em,
    ultimaImportacaoEm: row.ultima_importacao_em,
    coberturaEsocial: row.cobertura_esocial,
    situacaoExtracao: row.situacao_extracao,
  };
}

export function mapEmpresaToCompanyInsert(
  empresa: Empresa,
  organizationId: string,
): Omit<CompanyRow, "organization_id"> & { organization_id: string } {
  return {
    id: empresa.id,
    organization_id: organizationId,
    razao_social: empresa.razaoSocial,
    cnpj: empresa.cnpj,
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
  };
}

export function mapPeriodoRow(row: SolicitacaoPeriodoRow): PeriodoExtracao {
  return {
    id: row.id,
    competencia: row.competencia,
    status: row.status,
  };
}

export function mapSolicitacao(
  row: SolicitacaoRow,
  periodos: PeriodoExtracao[],
): Solicitacao {
  return {
    id: row.id,
    empresaId: row.company_id,
    modo: row.modo,
    status: row.status as StatusSolicitacao,
    aPartirDe: row.a_partir_de ?? undefined,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    relatorioParcial: row.relatorio_parcial,
    relatorioDisponivel: row.relatorio_disponivel,
    logErro: row.log_erro ?? undefined,
    periodos,
    ultimaAtualizacaoDadosEm: row.ultima_atualizacao_dados_em ?? undefined,
  };
}

export function mapAnaliseRow(row: AnaliseRow): Analise {
  return {
    id: row.id,
    empresaId: row.company_id,
    titulo: row.titulo,
    status: row.status,
    passivoEstimado: Number(row.passivo_estimado) || 0,
    progresso: row.progresso,
    atualizadoEm: row.atualizado_em,
    resumo: row.resumo ?? undefined,
  };
}

export function mapNotificationRow(row: NotificationRow): Notificacao {
  return {
    id: row.id,
    titulo: row.titulo,
    mensagem: row.mensagem,
    criadaEm: row.criada_em,
    lida: row.lida,
    href: row.href ?? undefined,
  };
}
