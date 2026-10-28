import { z } from "zod";

const cnpjDigits = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(z.string().length(14, "CNPJ deve ter 14 dígitos."));

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .max(254, "E-mail muito longo."),
  senha: z
    .string()
    .min(4, "Senha inválida.")
    .max(128, "Senha muito longa."),
});

export const novaEmpresaSchema = z.object({
  razaoSocial: z
    .string()
    .trim()
    .min(3, "Informe a razão social.")
    .max(200, "Razão social muito longa."),
  segmento: z.string().trim().min(1, "Selecione o segmento.").max(120),
  cnpj: cnpjDigits,
  email: z.string().trim().email("Informe um e-mail válido.").max(254),
  grupoEsocial: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  tipoAcesso: z.enum(["certificado_proprio", "procuracao"]),
});

export const escritorioSchema = z.object({
  razaoSocial: z.string().trim().min(3).max(200),
  cnpj: cnpjDigits,
  email: z.string().trim().email().max(254),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type NovaEmpresaInput = z.infer<typeof novaEmpresaSchema>;
export type EscritorioInput = z.infer<typeof escritorioSchema>;

export function errosZod(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
