const MAX_CERT_BYTES = 5 * 1024 * 1024; // 5 MB
const CERT_EXT = /\.(pfx|p12)$/i;

export type CertificadoFileCheck =
  | { ok: true; nomeSeguro: string }
  | { ok: false; erro: string };

/** Remove path e normaliza nome de arquivo de certificado A1. */
export function sanitizeFileName(nome: string): string {
  const base = nome.replace(/\\/g, "/").split("/").pop() ?? "certificado.pfx";
  return base.replace(/[^\w.\-()+ ]/g, "_").slice(0, 120);
}

export function validarArquivoCertificadoA1(file: File): CertificadoFileCheck {
  if (file.size <= 0) return { ok: false, erro: "Arquivo vazio." };
  if (file.size > MAX_CERT_BYTES) {
    return { ok: false, erro: "Certificado maior que 5 MB." };
  }
  const nomeSeguro = sanitizeFileName(file.name);
  if (!CERT_EXT.test(nomeSeguro)) {
    return { ok: false, erro: "Envie um arquivo .pfx ou .p12 (A1)." };
  }
  return { ok: true, nomeSeguro };
}
