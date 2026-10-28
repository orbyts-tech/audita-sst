import type { Empresa } from "@/features/empresas/types";
import type { NovaEmpresaInput } from "@/lib/validation/schemas";

/** Factory de empresa — sem efeitos colaterais (SRP). */
export function criarEmpresaFromInput(
  dados: NovaEmpresaInput,
  agoraIso: string,
  id = String(Date.now()),
): Empresa {
  return {
    id,
    razaoSocial: dados.razaoSocial,
    segmento: dados.segmento,
    cnpj: dados.cnpj,
    email: dados.email,
    grupoEsocial: dados.grupoEsocial,
    tipoAcesso: dados.tipoAcesso,
    passivoEstimado: 0,
    status: "pendente",
    atualizadoEm: agoraIso,
    ultimaImportacaoEm: null,
    coberturaEsocial: "sem_dados",
    situacaoExtracao: "nunca_importado",
  };
}
