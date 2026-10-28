import { useRef, useState, type FormEvent } from "react";
import { FileKey2, Upload } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, TextInput } from "@/components/ui/TextField";
import { formatAtualizacao, formatCNPJ } from "@/lib/format";
import { validarArquivoCertificadoA1 } from "@/lib/security/sanitizeFileName";
import { errosZod, escritorioSchema } from "@/lib/validation/schemas";

export function MeusDadosPage() {
  const { escritorio, atualizarEscritorio, enviarCertificadoA1 } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [razaoSocial, setRazaoSocial] = useState(escritorio.razaoSocial);
  const [cnpj, setCnpj] = useState(formatCNPJ(escritorio.cnpj));
  const [email, setEmail] = useState(escritorio.email);
  const [salvo, setSalvo] = useState(false);
  const [certMsg, setCertMsg] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  function onSalvar(e: FormEvent) {
    e.preventDefault();
    const parsed = escritorioSchema.safeParse({ razaoSocial, cnpj, email });
    if (!parsed.success) {
      setErros(errosZod(parsed.error));
      return;
    }
    setErros({});
    atualizarEscritorio(parsed.data);
    setCnpj(formatCNPJ(parsed.data.cnpj));
    setSalvo(true);
    window.setTimeout(() => setSalvo(false), 2500);
  }

  function onCertificado(file: File | undefined) {
    if (!file) return;
    const check = validarArquivoCertificadoA1(file);
    if (!check.ok) {
      setCertMsg(check.erro);
      return;
    }
    enviarCertificadoA1(check.nomeSeguro);
    setCertMsg(
      `Certificado ${check.nomeSeguro} registrado (mock — sem validação de dono).`,
    );
  }

  const cert = escritorio.certificadoA1;
  const enviado = cert ? formatAtualizacao(cert.enviadoEm) : null;

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-8">
      <PageHeader
        title="Meus dados"
        description="Dados do escritório e certificado A1 de procuração — vale para todas as empresas atendidas."
      />

      <form
        onSubmit={onSalvar}
        className="flex flex-col gap-6 rounded-2xl bg-surface-0 p-6 shadow-card"
      >
        <Field label="Razão social do escritório" htmlFor="razao" error={erros.razaoSocial}>
          <TextInput
            id="razao"
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="CNPJ" htmlFor="cnpj" error={erros.cnpj}>
          <TextInput
            id="cnpj"
            value={cnpj}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 14);
              setCnpj(d.length === 14 ? formatCNPJ(d) : d);
            }}
          />
        </Field>
        <Field label="E-mail" htmlFor="email" error={erros.email}>
          <TextInput
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
          />
        </Field>
        <Button type="submit">Salvar dados</Button>
        {salvo && (
          <p className="text-sm font-semibold text-success-600" role="status">
            Dados salvos.
          </p>
        )}
      </form>

      <section className="flex flex-col gap-4 rounded-2xl bg-surface-0 p-6 shadow-card">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FileKey2 aria-hidden className="size-5" />
          </span>
          <div>
            <h2 className="font-bold text-navy-900">Certificado A1 (procuração)</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Usado quando a empresa está com tipo de acesso “Procuração”. O sistema não confere se
              o certificado pertence à empresa.
            </p>
          </div>
        </div>

        {cert ? (
          <dl className="rounded-xl border border-border bg-surface-50 px-4 py-3 text-sm">
            <div className="flex justify-between gap-2 py-1">
              <dt className="text-ink-muted">Arquivo</dt>
              <dd className="font-semibold text-navy-900">{cert.nomeArquivo}</dd>
            </div>
            {cert.validadeAte && (
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-ink-muted">Validade</dt>
                <dd className="font-semibold text-navy-900">{cert.validadeAte}</dd>
              </div>
            )}
            {enviado && (
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-ink-muted">Enviado em</dt>
                <dd className="font-semibold text-navy-900">
                  {enviado.data} {enviado.hora}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-warning-600">Nenhum certificado enviado ainda.</p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".pfx,.p12"
          className="sr-only"
          onChange={(e) => onCertificado(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          iconLeft={<Upload aria-hidden className="size-5" />}
          onClick={() => fileRef.current?.click()}
        >
          {cert ? "Substituir certificado" : "Enviar certificado A1"}
        </Button>
        {certMsg && (
          <p className="text-sm font-semibold text-success-600" role="status">
            {certMsg}
          </p>
        )}
      </section>
    </div>
  );
}
