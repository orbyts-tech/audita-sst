import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, TextInput } from "@/components/ui/TextField";

export function ConfiguracoesPage() {
  const { usuario, atualizarPerfil, logout, memberships, organizationId, selecionarOrganizacao } =
    useApp();
  const navigate = useNavigate();
  const [nome, setNome] = useState(usuario.nome);
  const [salvo, setSalvo] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    atualizarPerfil({ nome: nome.trim() || usuario.nome });
    setSalvo(true);
    window.setTimeout(() => setSalvo(false), 2000);
  }

  async function sair() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-8">
      <PageHeader
        title="Configurações"
        description="Gerencie seu perfil e preferências da conta."
      />

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6 rounded-2xl bg-surface-0 p-6 shadow-card"
      >
        <h2 className="text-lg font-bold text-navy-900">Meu perfil</h2>
        <Field label="Nome" htmlFor="nome">
          <TextInput id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <Field label="Papel na organização" htmlFor="papel">
          <TextInput id="papel" value={usuario.papel} readOnly disabled />
        </Field>
        {memberships.length > 1 && (
          <Field label="Organização ativa" htmlFor="org-ativa">
            <select
              id="org-ativa"
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-navy-900"
              value={organizationId ?? ""}
              onChange={(e) => {
                void selecionarOrganizacao(e.target.value);
              }}
            >
              {memberships.map((m) => (
                <option key={m.organizationId} value={m.organizationId}>
                  {m.razaoSocial} ({m.role})
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Salvar alterações</Button>
          {salvo && (
            <span className="text-sm font-semibold text-success-600" role="status">
              Alterações salvas.
            </span>
          )}
        </div>
      </form>

      <section className="rounded-2xl border border-danger-200 bg-surface-0 p-6 shadow-card">
        <h2 className="text-lg font-bold text-navy-900">Sessão</h2>
        <p className="mt-2 text-[15px] text-ink-muted">
          Encerrar a sessão neste navegador.
        </p>
        <Button variant="danger" className="mt-4" onClick={() => void sair()}>
          Sair
        </Button>
      </section>
    </div>
  );
}
