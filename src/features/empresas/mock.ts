import type { StatusAnalise } from "@/components/ui/StatusBadge";
import type { CoberturaEsocial, SituacaoExtracao } from "@/features/esocial/types";
import type { GrupoEsocial, TipoAcessoEsocial } from "@/features/solicitacoes/labels";
import type { Empresa } from "./types";

const BASE: Empresa[] = [
  {
    id: "1",
    razaoSocial: "Indústria Alpha Ltda.",
    segmento: "Indústria de Manufatura",
    cnpj: "12345678000190",
    email: "sst@alpha.example",
    grupoEsocial: 1,
    tipoAcesso: "procuracao",
    passivoEstimado: 284500,
    status: "completo",
    atualizadoEm: "2025-04-14T10:24:00-03:00",
    ultimaImportacaoEm: "2025-04-14T10:24:00-03:00",
    coberturaEsocial: "parcial",
    situacaoExtracao: "parcial",
  },
  {
    id: "2",
    razaoSocial: "Comércio Beta S.A.",
    segmento: "Comércio Varejista",
    cnpj: "98765432000111",
    email: "rh@beta.example",
    grupoEsocial: 2,
    tipoAcesso: "procuracao",
    passivoEstimado: 126300,
    status: "em_analise",
    atualizadoEm: "2025-04-10T16:18:00-03:00",
    ultimaImportacaoEm: "2025-04-10T16:18:00-03:00",
    coberturaEsocial: "parcial",
    situacaoExtracao: "processando",
  },
  {
    id: "3",
    razaoSocial: "Serviços Gama Ltda.",
    segmento: "Prestação de Serviços",
    cnpj: "45678901000122",
    email: "contato@gama.example",
    grupoEsocial: 3,
    tipoAcesso: "certificado_proprio",
    passivoEstimado: 42800,
    status: "parcial",
    atualizadoEm: "2025-04-08T09:42:00-03:00",
    ultimaImportacaoEm: null,
    coberturaEsocial: "sem_dados",
    situacaoExtracao: "nunca_importado",
  },
  {
    id: "4",
    razaoSocial: "Construtora Delta",
    segmento: "Construção Civil",
    cnpj: "33444555000103",
    email: "seguranca@delta.example",
    grupoEsocial: 1,
    tipoAcesso: "procuracao",
    passivoEstimado: 910250,
    status: "em_analise",
    atualizadoEm: "2025-04-02T14:37:00-03:00",
    ultimaImportacaoEm: "2025-04-02T14:37:00-03:00",
    coberturaEsocial: "parcial",
    situacaoExtracao: "parcial",
  },
  {
    id: "5",
    razaoSocial: "Transportes Épsilon",
    segmento: "Transporte Rodoviário",
    cnpj: "77888999000166",
    email: "frota@epsilon.example",
    grupoEsocial: 4,
    tipoAcesso: "procuracao",
    passivoEstimado: 367100,
    status: "completo",
    atualizadoEm: "2025-03-28T11:03:00-03:00",
    ultimaImportacaoEm: "2025-03-28T11:03:00-03:00",
    coberturaEsocial: "completa",
    situacaoExtracao: "concluido",
  },
];

const SEGMENTOS = [
  "Indústria de Manufatura",
  "Comércio Varejista",
  "Prestação de Serviços",
  "Construção Civil",
  "Transporte Rodoviário",
] as const;

const STATUS: StatusAnalise[] = ["completo", "em_analise", "parcial", "pendente"];
const COBERTURA: CoberturaEsocial[] = ["parcial", "sem_dados", "desconhecida", "completa"];
const EXTRACAO: SituacaoExtracao[] = ["parcial", "nunca_importado", "processando", "concluido"];
const GRUPOS: GrupoEsocial[] = [1, 2, 3, 4];
const ACESSOS: TipoAcessoEsocial[] = ["procuracao", "certificado_proprio"];

const NOMES = [
  "Metalúrgica Zeta",
  "Farmácia Eta",
  "Logística Theta",
  "Alimentos Iota",
  "Tecnologia Kappa",
  "Energia Lambda",
  "Química Mu",
  "Papel Nu",
  "Vidros Xi",
  "Plásticos Omicron",
  "Mineração Pi",
  "Agro Rho",
  "Têxtil Sigma",
  "Automação Tau",
  "Embalagens Upsilon",
  "Cerâmica Phi",
  "Siderúrgica Chi",
  "Petroleira Psi",
  "Biotec Omega",
  "Holding Atlas",
  "Grupo Horizon",
  "Cooperativa Norte",
  "Indústria Sul",
  "Comércio Leste",
  "Serviços Oeste",
];

function extras(): Empresa[] {
  return NOMES.map((nome, i) => {
    const n = i + 6;
    const cnpjBase = String(10000000000000 + n * 111111).slice(0, 14);
    const dia = String((n % 27) + 1).padStart(2, "0");
    const iso = `2025-03-${dia}T09:00:00-03:00`;
    const situacaoExtracao = EXTRACAO[i % EXTRACAO.length]!;
    return {
      id: String(n),
      razaoSocial: `${nome} Ltda.`,
      segmento: SEGMENTOS[i % SEGMENTOS.length]!,
      cnpj: cnpjBase,
      email: `contato@empresa${n}.example`,
      grupoEsocial: GRUPOS[i % GRUPOS.length]!,
      tipoAcesso: ACESSOS[i % ACESSOS.length]!,
      passivoEstimado: 15000 + n * 18750,
      status: STATUS[i % STATUS.length]!,
      atualizadoEm: iso,
      ultimaImportacaoEm: situacaoExtracao === "nunca_importado" ? null : iso,
      coberturaEsocial: COBERTURA[i % COBERTURA.length]!,
      situacaoExtracao,
    };
  });
}

export const EMPRESAS_MOCK: Empresa[] = [...BASE, ...extras()];
