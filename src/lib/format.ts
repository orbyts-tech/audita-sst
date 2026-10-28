const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dia = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});
const hora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** 284500 -> "R$ 284.500,00" (o Intl usa espaço não separável depois de "R$") */
export const formatBRL = (valor: number) => brl.format(valor);

/** "12345678000190" -> "12.345.678/0001-90" */
export function formatCNPJ(cnpj: string) {
  const d = cnpj.replace(/\D/g, "").padStart(14, "0").slice(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/** ISO -> { data: "14/04/2025", hora: "às 10:24" } */
export function formatAtualizacao(iso: string) {
  const d = new Date(iso);
  return { data: dia.format(d), hora: `às ${hora.format(d)}` };
}

/** "Indústria Alpha Ltda." -> "IA" (primeiras letras das duas primeiras palavras significativas) */
export function iniciais(nome: string) {
  const ignorar = new Set(["de", "da", "do", "das", "dos", "e", "ltda", "ltda.", "s.a.", "sa", "me", "eireli"]);
  const partes = nome.split(/\s+/).filter((p) => p && !ignorar.has(p.toLowerCase()));
  return normalizar(partes.slice(0, 2).map((p) => p[0]!).join("")).toLocaleUpperCase("pt-BR");
}

/** Busca sem acento e sem máscara: "construtora" acha "Construtora Delta"; "33444" acha "33.444.555/0001-03" */
export function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
