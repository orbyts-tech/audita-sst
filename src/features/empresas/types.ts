import type { StatusAnalise } from "@/components/ui/StatusBadge";
import type { CoberturaEsocial, SituacaoExtracao } from "@/features/esocial/types";
import type { GrupoEsocial, TipoAcessoEsocial } from "@/features/solicitacoes/labels";

export interface Empresa {
  id: string;
  razaoSocial: string;
  segmento: string;
  /** Só dígitos, 14 caracteres. */
  cnpj: string;
  email: string;
  /** Grupo eSocial 1–4: define desde quando buscar eventos. */
  grupoEsocial: GrupoEsocial;
  /** Certificado próprio ou procuração do escritório. */
  tipoAcesso: TipoAcessoEsocial;
  passivoEstimado: number;
  status: StatusAnalise;
  atualizadoEm: string;
  ultimaImportacaoEm?: string | null;
  coberturaEsocial: CoberturaEsocial;
  situacaoExtracao: SituacaoExtracao;
}
