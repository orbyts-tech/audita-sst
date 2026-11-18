import { getAccessToken } from "@/lib/auth/supabaseAuth";

export type ApiErrorBody = {
  error?: { code?: string; message?: string };
};

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    throw new Error("Sessão inválida ou expirada.");
  }
  const data = (await res.json()) as T & ApiErrorBody;
  if (!res.ok) {
    throw new Error(data.error?.message || `Erro HTTP ${res.status}`);
  }
  return data;
}

export type CertificadoStatus = {
  configured: boolean;
  ambiente: string;
  transportMock?: boolean;
  message?: string;
  subjectCN?: string;
  notBefore?: string;
  notAfter?: string;
  cnpjBase?: string;
};

export type ConsultaResult = {
  consultaId: string;
  status: string;
  message?: string;
  cdResposta?: string;
  descResposta?: string;
  ambiente: string;
  transportMock: boolean;
  certificado?: { subjectCN: string; notAfter: string };
  identificadores: Array<{ id: string; nrRec?: string }>;
  eventos: Array<{
    id: string;
    eventType: string;
    eventId: string;
    nrRecibo?: string;
    dataConsulta: string;
    xmlSha256: string;
    payload?: Record<string, unknown>;
  }>;
};

export function fetchCertificadoStatus(companyId: string) {
  return apiFetch<CertificadoStatus>(`/api/empresas/${companyId}/esocial/certificado/status`);
}

export function iniciarConsultaS1000(companyId: string) {
  return apiFetch<ConsultaResult>(`/api/empresas/${companyId}/esocial/consultas`, {
    method: "POST",
    body: JSON.stringify({ eventType: "S-1000" }),
  });
}

export function listarEventosEsocial(companyId: string, tipo = "S-1000") {
  return apiFetch<{ items: ConsultaResult["eventos"] }>(
    `/api/empresas/${companyId}/esocial/eventos?tipo=${encodeURIComponent(tipo)}`,
  );
}
