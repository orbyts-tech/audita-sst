export interface Escritorio {
  razaoSocial: string;
  cnpj: string;
  email: string;
  /** Certificado A1 de procuração — vale para todas as empresas atendidas. */
  certificadoA1?: {
    nomeArquivo: string;
    validadeAte?: string;
    enviadoEm: string;
  };
}
