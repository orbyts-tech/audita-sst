export interface Escritorio {
  razaoSocial: string;
  cnpj: string;
  email: string;
  /** Metadados do certificado A1 validado (PFX/senha não são armazenados nesta etapa). */
  certificadoA1?: {
    nomeArquivo: string;
    validadeAte?: string;
    enviadoEm: string;
    subjectCN?: string;
    cnpjBase?: string;
  };
}
