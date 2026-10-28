import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, TextInput, TextSelect } from "@/components/ui/TextField";
import { formatCNPJ } from "@/lib/format";

export function NovaSolicitacaoPage() {
  const { empresas, obterSolicitacaoDaEmpresa, criarSolicitacao } = useApp();
  const navigate = useNavigate();
  const [empresaId, setEmpresaId] = useState("");
  const [aPartirDe, setAPartirDe] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const disponiveis = empresas.filter((e) => !obterSolicitacaoDaEmpresa(e.id));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!empresaId) {
      setErro("Selecione a empresa.");
      return;
    }
    const competencia = aPartirDe.trim();
    if (competencia && !/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
      setErro("Competência inválida. Use AAAA-MM.");
      return;
    }
    const result = criarSolicitacao(empresaId, competencia || undefined);
    if ("erro" in result) {
      setErro(result.erro);
      return;
    }
    navigate(`/solicitacoes/${result.id}`);
  }

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-8">
      <button
        type="button"
        onClick={() => navigate("/solicitacoes")}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Voltar para solicitações
      </button>

      <PageHeader
        title="Nova solicitação"
        description="Modo automático: acumula o histórico do eSocial. Uma solicitação por empresa."
      />

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6 rounded-2xl bg-surface-0 p-6 shadow-card"
      >
        <Field label="Empresa" htmlFor="empresa" error={erro && !empresaId ? erro : undefined}>
          <TextSelect
            id="empresa"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {disponiveis.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.razaoSocial} — {formatCNPJ(emp.cnpj)}
              </option>
            ))}
          </TextSelect>
        </Field>

        {disponiveis.length === 0 && (
          <p className="rounded-md bg-warning-100 px-4 py-3 text-sm text-warning-600">
            Todas as empresas já têm solicitação ativa. Cadastre outra empresa ou use
            “Atualizar dados” na solicitação existente.
          </p>
        )}

        <Field
          label="Começar a partir de (opcional)"
          htmlFor="apartir"
          hint="Competência AAAA-MM. Em branco = desde o início do grupo eSocial da empresa."
        >
          <TextInput
            id="apartir"
            value={aPartirDe}
            onChange={(e) => setAPartirDe(e.target.value)}
            placeholder="2024-01"
          />
        </Field>

        <p className="text-sm text-ink-muted">
          Orçamento comercial fica fora do sistema. Após criar, o robô entra em execução em
          menos de 1 minuto (simulado neste MVP).
        </p>

        {erro && empresaId && (
          <p className="text-sm text-danger-600" role="alert">
            {erro}
          </p>
        )}

        <Button type="submit" disabled={disponiveis.length === 0}>
          Criar solicitação automática
        </Button>
      </form>
    </div>
  );
}
