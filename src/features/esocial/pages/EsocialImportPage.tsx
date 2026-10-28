import { useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileUp } from "lucide-react";
import { useApp } from "@/app/AppProvider";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/TextField";
import { formatCNPJ } from "@/lib/format";
import { ESOCIAL_CONFIG } from "../config";
import { useEsocial } from "../EsocialProvider";
import { PIPELINE_PHASE_LABELS } from "../pipeline/simulateImport";
import type { PipelinePhase } from "../types";

export function EsocialImportPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { obterEmpresa } = useApp();
  const { startImport, getBatches, activeBatchId } = useEsocial();
  const empresa = obterEmpresa(id);
  const navigate = useNavigate();

  const [files, setFiles] = useState<File[]>([]);
  const [cnpjConfirm, setCnpjConfirm] = useState(empresa ? formatCNPJ(empresa.cnpj) : "");
  const [erro, setErro] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);

  const batches = getBatches(id);
  const ativo = batches.find((b) => b.id === activeBatchId);

  const fases = useMemo(
    () => Object.keys(PIPELINE_PHASE_LABELS) as PipelinePhase[],
    [],
  );

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
    setErro(null);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!empresa) return;
    const digitos = cnpjConfirm.replace(/\D/g, "");
    if (digitos !== empresa.cnpj) {
      setErro("CNPJ de destino não confere com a empresa selecionada.");
      return;
    }
    if (files.length === 0) {
      setErro("Selecione arquivos XML ou ZIP.");
      return;
    }
    setRodando(true);
    setErro(null);
    try {
      await startImport(
        empresa.id,
        empresa.cnpj,
        files.map((f) => ({ name: f.name, size: f.size })),
      );
      setFiles([]);
      navigate(`/empresas/${id}/esocial/extracoes`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na importação.");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5 rounded-2xl bg-surface-0 p-5 shadow-card"
      >
        <h2 className="text-lg font-bold text-navy-900">Importar XML/ZIP</h2>
        <p className="text-sm text-ink-muted">
          MVP: upload manual. Webservices SOAP ficam preparados, mas desabilitados.
          Extensões: {ESOCIAL_CONFIG.importacao.extensoesPermitidas.join(", ")}.
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface-50 px-6 py-10 text-center"
        >
          <FileUp aria-hidden className="size-8 text-blue-600" />
          <p className="text-sm text-ink-muted">Arraste arquivos aqui ou</p>
          <label className="cursor-pointer">
            <span className="font-semibold text-blue-600 hover:text-blue-700">
              Selecionar arquivos
            </span>
            <input
              type="file"
              accept=".xml,.zip,application/zip,text/xml"
              multiple
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 w-full max-w-md text-left text-sm text-navy-900">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`} className="truncate">
                  {f.name}{" "}
                  <span className="text-ink-muted">
                    ({Math.round(f.size / 1024)} KB)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Field label="Confirmar CNPJ de destino" htmlFor="cnpj-dest" error={erro ?? undefined}>
          <TextInput
            id="cnpj-dest"
            value={cnpjConfirm}
            onChange={(e) => setCnpjConfirm(e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={rodando}>
            {rodando ? "Processando…" : "Iniciar importação"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/empresas/${id}/esocial/extracoes`)}
          >
            Ver lotes
          </Button>
        </div>
      </form>

      {(rodando || ativo) && (
        <div className="rounded-2xl bg-surface-0 p-5 shadow-card">
          <h3 className="font-bold text-navy-900">Progresso do lote</h3>
          <ol className="mt-4 flex flex-col gap-2">
            {fases.map((phase) => {
              const atual = ativo?.phase ?? "enviando";
              const idx = fases.indexOf(phase);
              const atualIdx = fases.indexOf(atual);
              const done = idx < atualIdx || atual === "concluido";
              const current = phase === atual && atual !== "concluido";
              return (
                <li
                  key={phase}
                  className={
                    done
                      ? "text-sm font-semibold text-success-600"
                      : current
                        ? "text-sm font-semibold text-blue-600"
                        : "text-sm text-ink-muted"
                  }
                >
                  {PIPELINE_PHASE_LABELS[phase]}
                  {current ? "…" : done ? " ✓" : ""}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
