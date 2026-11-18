import { getAccessToken } from "@/lib/auth/supabaseAuth";
import { getApiBaseUrl, type ApiErrorBody } from "@/lib/esocialApi";

export type CertificadoValidacaoResult = {
  valid: true;
  nomeArquivo: string;
  subjectCN: string;
  subjectO?: string;
  cnpjBase?: string;
  notBefore: string;
  notAfter: string;
  serialNumber: string;
  message: string;
};

/** Envia PFX + senha para validação no servidor. Não persiste o arquivo. */
export async function validarCertificadoA1(input: {
  organizationId: string;
  file: File;
  senha: string;
}): Promise<CertificadoValidacaoResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const form = new FormData();
  form.append("certificado", input.file, input.file.name);
  form.append("senha", input.senha);

  const res = await fetch(
    `${getApiBaseUrl()}/api/organizacoes/${input.organizationId}/certificados/validar`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    },
  );

  const data = (await res.json()) as CertificadoValidacaoResult & ApiErrorBody;
  if (res.status === 401) {
    throw new Error("Sessão inválida ou expirada.");
  }
  if (!res.ok) {
    throw new Error(data.error?.message || `Erro HTTP ${res.status}`);
  }
  return data;
}
