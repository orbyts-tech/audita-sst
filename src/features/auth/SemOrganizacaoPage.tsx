import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/TextField";

export function SemOrganizacaoPage() {
  const { criarOrganizacao, bootstrapError, semOrganizacao } = useApp();
  if (!semOrganizacao) return <Navigate to="/solicitacoes" replace />;
  const [razaoSocial, setRazaoSocial] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (razaoSocial.trim().length < 3) {
      setErro("Informe a razão social da organização.");
      return;
    }
    setLoading(true);
    try {
      const r = await criarOrganizacao({ razaoSocial: razaoSocial.trim() });
      if (!r.ok) setErro(r.erro);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="rounded-2xl bg-surface-0 p-8 shadow-card">
        <h1 className="text-2xl font-bold text-navy-900">Nenhuma organização vinculada</h1>
        <p className="mt-2 text-[15px] text-ink-muted">
          Seu usuário autenticado ainda não participa de nenhuma organização. Peça um
          convite ao administrador ou inicie o onboarding controlado abaixo.
        </p>
        {(erro || bootstrapError) && (
          <p className="mt-4 text-sm text-danger-600">{erro ?? bootstrapError}</p>
        )}
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Razão social da organização" htmlFor="org-razao">
            <TextInput
              id="org-razao"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              placeholder="Escritório de SST Ltda."
              maxLength={200}
              required
            />
          </Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando…" : "Criar minha organização"}
          </Button>
        </form>
      </div>
    </div>
  );
}
