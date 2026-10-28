import type { Notificacao } from "./types";

export const NOTIFICACOES_MOCK: Notificacao[] = [
  {
    id: "n1",
    titulo: "Análise concluída",
    mensagem: "A auditoria da Indústria Alpha Ltda. foi finalizada.",
    criadaEm: "2025-04-14T10:30:00-03:00",
    lida: false,
    href: "/empresas/1",
  },
  {
    id: "n2",
    titulo: "Documentos pendentes",
    mensagem: "Serviços Gama Ltda. ainda não enviou o PPP histórico.",
    criadaEm: "2025-04-08T11:00:00-03:00",
    lida: false,
    href: "/empresas/3",
  },
  {
    id: "n3",
    titulo: "Relatório disponível",
    mensagem: "O relatório de Transportes Épsilon está pronto para download.",
    criadaEm: "2025-03-28T12:00:00-03:00",
    lida: true,
    href: "/relatorios",
  },
];
