import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, FileKey2, Loader2, Upload } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, TextInput } from "@/components/ui/TextField";
import { validarCertificadoA1 } from "@/lib/certificateApi";
import { formatAtualizacao, formatCNPJ } from "@/lib/format";
import { validarArquivoCertificadoA1 } from "@/lib/security/sanitizeFileName";
import { errosZod, escritorioSchema } from "@/lib/validation/schemas";

export function MeusDadosPage() {
  const {
    escritorio,
    atualizarEscritorio,
    enviarCertificadoA1,
    can,
    organizationId,
  } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [razaoSocial, setRazaoSocial] = useState(escritorio.razaoSocial);
  const [cnpj, setCnpj] = useState(formatCNPJ(escritorio.cnpj));
  const [email, setEmail] = useState(escritorio.email);
  const [salvo, setSalvo] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [validando, setValidando] = useState(false);
  const [certErro, setCertErro] = useState<string | null>(null);
  const [certOk, setCertOk] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const podeGerenciarCert = can("org.certificates.manage");

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

  function onEscolherArquivo(file: File | undefined) {
    setCertErro(null);
    setCertOk(false);
    setSenha("");
    if (!file) {
      setArquivo(null);
      return;
    }
    const check = validarArquivoCertificadoA1(file);
    if (!check.ok) {
      setArquivo(null);
      setCertErro(check.erro);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setArquivo(file);
  }

  async function onValidarCertificado(e: FormEvent) {
    e.preventDefault();
    setCertErro(null);
    setCertOk(false);

    if (!podeGerenciarCert) {
      setCertErro("Sem permissão para gerenciar certificados.");
      return;
    }
    if (!organizationId) {
      setCertErro("Nenhuma organização ativa para validar o certificado.");
      return;
    }
    if (!arquivo) {
      setCertErro("Selecione o arquivo .pfx ou .p12.");
      return;
    }
    if (senha.trim().length < 1) {
      setCertErro("Informe a senha do certificado.");
      return;
    }

    const check = validarArquivoCertificadoA1(arquivo);
    if (!check.ok) {
      setCertErro(check.erro);
      return;
    }

    setValidando(true);
    try {
      const result = await validarCertificadoA1({
        organizationId,
        file: arquivo,
        senha,
      });
      const validadeAte = result.notAfter.slice(0, 10);
      enviarCertificadoA1({
        nomeArquivo: result.nomeArquivo || check.nomeSeguro,
        validadeAte,
        subjectCN: result.subjectCN,
        cnpjBase: result.cnpjBase,
      });
      setCertOk(true);
      setSenha("");
      setArquivo(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setCertErro(err instanceof Error ? err.message : "Falha ao validar certificado.");
    } finally {
      setValidando(false);
    }
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
              O arquivo e a senha são validados no servidor e não ficam armazenados nesta etapa —
              apenas os metadados do certificado.
            </p>
          </div>
        </div>

        {cert ? (
          <dl className="rounded-xl border border-border bg-surface-50 px-4 py-3 text-sm">
            <div className="flex justify-between gap-2 py-1">
              <dt className="text-ink-muted">Arquivo</dt>
              <dd className="font-semibold text-navy-900">{cert.nomeArquivo}</dd>
            </div>
            <div className="flex justify-between gap-2 py-1">
              <dt className="text-ink-muted">Status</dt>
              <dd className="font-semibold text-success-600">Válido</dd>
            </div>
            {cert.subjectCN && (
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-ink-muted">Titular</dt>
                <dd className="max-w-[60%] text-right font-semibold text-navy-900">
                  {cert.subjectCN}
                </dd>
              </div>
            )}
            {cert.cnpjBase && (
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-ink-muted">CNPJ base</dt>
                <dd className="font-semibold tabular-nums text-navy-900">{cert.cnpjBase}</dd>
              </div>
            )}
            {cert.validadeAte && (
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-ink-muted">Validade</dt>
                <dd className="font-semibold text-navy-900">{cert.validadeAte}</dd>
              </div>
            )}
            {enviado && (
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-ink-muted">Validado em</dt>
                <dd className="font-semibold text-navy-900">
                  {enviado.data} {enviado.hora}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-warning-600">Nenhum certificado validado ainda.</p>
        )}

        <form onSubmit={onValidarCertificado} className="flex flex-col gap-4">
          <input
            ref={fileRef}
            type="file"
            accept=".pfx,.p12"
            className="sr-only"
            onChange={(e) => onEscolherArquivo(e.target.files?.[0])}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              iconLeft={<Upload aria-hidden className="size-5" />}
              onClick={() => fileRef.current?.click()}
              disabled={validando || !podeGerenciarCert}
            >
              {arquivo ? "Trocar arquivo" : "Selecionar certificado"}
            </Button>
            {arquivo && (
              <span className="text-sm font-medium text-navy-900">{arquivo.name}</span>
            )}
          </div>

          <Field label="Senha do certificado" htmlFor="cert-senha">
            <TextInput
              id="cert-senha"
              type="password"
              autoComplete="off"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              maxLength={128}
              disabled={validando || !podeGerenciarCert}
            />
          </Field>

          <Button
            type="submit"
            disabled={validando || !podeGerenciarCert}
            iconLeft={
              validando ? (
                <Loader2 aria-hidden className="size-5 animate-spin" />
              ) : (
                <CheckCircle2 aria-hidden className="size-5" />
              )
            }
          >
            {validando ? "Validando certificado…" : "Validar certificado"}
          </Button>
        </form>

        {certErro && (
          <p className="text-sm font-semibold text-danger-600" role="alert">
            {certErro}
          </p>
        )}
        {certOk && (
          <div
            className="flex items-start gap-3 rounded-xl border border-success-200 bg-success-100 px-4 py-3"
            role="status"
          >
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-success-600" />
            <div>
              <p className="text-sm font-bold text-success-600">Certificado válido</p>
              <p className="mt-1 text-sm text-navy-900">
                O certificado A1 foi aberto e validado no servidor. Arquivo e senha não foram
                armazenados. Confira também a notificação no sino.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
