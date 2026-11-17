export type OrganizationRow = {
  id: string;
  razao_social: string;
  cnpj: string | null;
  email: string | null;
};

export type OrganizationCertificateRow = {
  id: string;
  organization_id: string;
  nome_arquivo: string;
  validade_ate: string | null;
  enviado_em: string;
};

export type CompanyRow = {
  id: string;
  organization_id: string;
  razao_social: string;
  cnpj: string;
  email: string;
  segmento: string;
  grupo_esocial: number;
  tipo_acesso: "certificado_proprio" | "procuracao";
  passivo_estimado: number | string;
  status: "completo" | "em_analise" | "parcial" | "pendente";
  cobertura_esocial: "completa" | "parcial" | "sem_dados" | "desconhecida";
  situacao_extracao:
    | "nunca_importado"
    | "processando"
    | "parcial"
    | "concluido"
    | "falhou";
  ultima_importacao_em: string | null;
  atualizado_em: string;
};

export type SolicitacaoRow = {
  id: string;
  company_id: string;
  modo: "automatico";
  status: string;
  a_partir_de: string | null;
  relatorio_parcial: boolean;
  relatorio_disponivel: boolean;
  log_erro: string | null;
  ultima_atualizacao_dados_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type SolicitacaoPeriodoRow = {
  id: string;
  solicitacao_id: string;
  competencia: string;
  status: "pendente" | "liberado" | "importado" | "erro";
};

export type AnaliseRow = {
  id: string;
  company_id: string;
  titulo: string;
  status: "completo" | "em_analise" | "parcial" | "pendente";
  passivo_estimado: number | string;
  progresso: number;
  resumo: string | null;
  atualizado_em: string;
};

export type NotificationRow = {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  titulo: string;
  mensagem: string;
  href: string | null;
  lida: boolean;
  criada_em: string;
};
