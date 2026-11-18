import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp } from "@/app/AppProvider";
import { AuditaLogo } from "@/components/brand/AuditaLogo";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/TextField";
import { statusBloqueioLogin } from "@/lib/auth/session";
import { errosZod, loginSchema } from "@/lib/validation/schemas";

export function LoginPage() {
  const { autenticado, sessionLoading, login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [fieldErros, setFieldErros] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 p-6">
        <p className="text-sm text-ink-muted">Verificando sessão…</p>
      </div>
    );
  }

  if (autenticado) return <Navigate to="/solicitacoes" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setFieldErros({});

    const bloqueio = statusBloqueioLogin();
    if (bloqueio.bloqueado) {
      setErro(`Muitas tentativas. Aguarde ${bloqueio.restanteSegundos}s.`);
      return;
    }

    const parsed = loginSchema.safeParse({ email, senha });
    if (!parsed.success) {
      setFieldErros(errosZod(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const r = await login(parsed.data.email, parsed.data.senha);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      navigate("/solicitacoes", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-surface-0 p-8 shadow-card">
        <div className="mb-8 flex justify-center">
          <AuditaLogo className="h-20" />
        </div>
        <h1 className="text-center text-2xl font-bold text-navy-900">Entrar no Audita SST</h1>
        <p className="mt-2 text-center text-[15px] text-ink-muted">
          Acompanhe o passivo de SST das suas empresas.
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
          <Field label="E-mail" htmlFor="email" error={fieldErros.email ?? erro ?? undefined}>
            <TextInput
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErro(null);
              }}
              placeholder="seu@email.com"
              required
              maxLength={254}
            />
          </Field>
          <Field label="Senha" htmlFor="senha" error={fieldErros.senha}>
            <TextInput
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro(null);
              }}
              placeholder="••••••••"
              required
              maxLength={128}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-muted">
          Acesso por convite. Após 5 falhas, bloqueio de 60s.
        </p>
      </div>
    </div>
  );
}
