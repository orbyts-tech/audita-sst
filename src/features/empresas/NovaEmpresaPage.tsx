import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, TextInput, TextSelect } from "@/components/ui/TextField";
import { formatCNPJ } from "@/lib/format";
import { errosZod, novaEmpresaSchema } from "@/lib/validation/schemas";
import { GRUPO_ESOCIAL, TIPO_ACESSO_LABEL, type GrupoEsocial, type TipoAcessoEsocial } from "@/features/solicitacoes/labels";
import { SEGMENTOS_OPCOES } from "./filtros";

export function NovaEmpresaPage() {
  const { adicionarEmpresa } = useApp();
  const navigate = useNavigate();
  const [razaoSocial, setRazaoSocial] = useState("");
  const [segmento, setSegmento] = useState<string>(SEGMENTOS_OPCOES[0]);
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [grupoEsocial, setGrupoEsocial] = useState<GrupoEsocial>(1);
  const [tipoAcesso, setTipoAcesso] = useState<TipoAcessoEsocial>("procuracao");
  const [erros, setErros] = useState<Record<string, string>>({});

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = novaEmpresaSchema.safeParse({
      razaoSocial,
      segmento,
      cnpj,
      email,
      grupoEsocial,
      tipoAcesso,
    });
    if (!parsed.success) {
      setErros(errosZod(parsed.error));
      return;
    }
    setErros({});
    const empresa = adicionarEmpresa(parsed.data);
    navigate(`/empresas/${empresa.id}`);
  }

  const grupoHint = GRUPO_ESOCIAL.find((g) => g.value === grupoEsocial);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-8">
      <button
        type="button"
        onClick={() => navigate("/empresas")}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Voltar para empresas
      </button>

      <PageHeader
        title="Nova empresa"
        description="CNPJ, e-mail, grupo eSocial e tipo de acesso ao certificado."
      />

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6 rounded-2xl bg-surface-0 p-6 shadow-card"
      >
        <Field label="Razão social" htmlFor="razao" error={erros.razaoSocial}>
          <TextInput
            id="razao"
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            placeholder="Ex.: Indústria Alpha Ltda."
            autoFocus
          />
        </Field>

        <Field label="CNPJ" htmlFor="cnpj" error={erros.cnpj}>
          <TextInput
            id="cnpj"
            inputMode="numeric"
            value={cnpj}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 14);
              setCnpj(d.length === 14 ? formatCNPJ(d) : d);
            }}
            placeholder="00.000.000/0000-00"
          />
        </Field>

        <Field label="E-mail" htmlFor="email" error={erros.email}>
          <TextInput
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@empresa.com.br"
          />
        </Field>

        <Field label="Segmento" htmlFor="segmento" error={erros.segmento}>
          <TextSelect
            id="segmento"
            value={segmento}
            onChange={(e) => setSegmento(e.target.value)}
          >
            {SEGMENTOS_OPCOES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </TextSelect>
        </Field>

        <Field
          label="Grupo do eSocial"
          htmlFor="grupo"
          hint={
            grupoHint
              ? `Busca de eventos a partir de ${grupoHint.desde}.`
              : undefined
          }
        >
          <TextSelect
            id="grupo"
            value={String(grupoEsocial)}
            onChange={(e) => setGrupoEsocial(Number(e.target.value) as GrupoEsocial)}
          >
            {GRUPO_ESOCIAL.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label} — desde {g.desde}
              </option>
            ))}
          </TextSelect>
        </Field>

        <Field
          label="Tipo de acesso"
          htmlFor="acesso"
          hint="Procuração usa o A1 cadastrado em Meus dados. Não validamos se o certificado é da empresa."
        >
          <TextSelect
            id="acesso"
            value={tipoAcesso}
            onChange={(e) => setTipoAcesso(e.target.value as TipoAcessoEsocial)}
          >
            {(Object.keys(TIPO_ACESSO_LABEL) as TipoAcessoEsocial[]).map((k) => (
              <option key={k} value={k}>
                {TIPO_ACESSO_LABEL[k]}
              </option>
            ))}
          </TextSelect>
        </Field>

        <Button type="submit">Cadastrar empresa</Button>
      </form>
    </div>
  );
}
