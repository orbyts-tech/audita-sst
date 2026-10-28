import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, TextInput, TextSelect } from "@/components/ui/TextField";

export function ConfiguracoesPage() {
  const { usuario, atualizarPerfil, logout } = useApp();
  const navigate = useNavigate();
  const [nome, setNome] = useState(usuario.nome);
  const [papel, setPapel] = useState(usuario.papel);
  const [salvo, setSalvo] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    atualizarPerfil({ nome: nome.trim() || usuario.nome, papel });
    setSalvo(true);
    window.setTimeout(() => setSalvo(false), 2000);
  }

  function sair() {
    logout();
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
        <Field label="Papel" htmlFor="papel">
          <TextSelect id="papel" value={papel} onChange={(e) => setPapel(e.target.value)}>
            <option value="Administrador">Administrador</option>
            <option value="Analista">Analista</option>
            <option value="Visualizador">Visualizador</option>
          </TextSelect>
        </Field>
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
        <Button variant="danger" className="mt-4" onClick={sair}>
          Sair
        </Button>
      </section>
    </div>
  );
}
