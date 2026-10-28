import type { StatusAnalise } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field, TextInput } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import {
  SEGMENTOS_OPCOES,
  type FiltrosEmpresas,
  FILTROS_VAZIOS,
} from "./filtros";

const STATUS_OPCOES: { value: StatusAnalise; label: string }[] = [
  { value: "completo", label: "Completo" },
  { value: "em_analise", label: "Em análise" },
  { value: "parcial", label: "Parcial" },
  { value: "pendente", label: "Pendente" },
];

export function FiltrosEmpresasDrawer({
  open,
  value,
  onChange,
  onClose,
  onAplicar,
}: {
  open: boolean;
  value: FiltrosEmpresas;
  onChange: (next: FiltrosEmpresas) => void;
  onClose: () => void;
  onAplicar: () => void;
}) {
  function toggleStatus(s: StatusAnalise) {
    onChange({
      ...value,
      status: value.status.includes(s)
        ? value.status.filter((x) => x !== s)
        : [...value.status, s],
    });
  }

  function toggleSegmento(seg: string) {
    onChange({
      ...value,
      segmentos: value.segmentos.includes(seg)
        ? value.segmentos.filter((x) => x !== seg)
        : [...value.segmentos, seg],
    });
  }

  return (
    <Drawer
      open={open}
      title="Filtros"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => onChange(FILTROS_VAZIOS)}
          >
            Limpar
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onAplicar();
              onClose();
            }}
          >
            Aplicar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-navy-900">Status da análise</h3>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPCOES.map((o) => {
              const ativo = value.status.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggleStatus(o.value)}
                  className={cn(
                    "h-10 rounded-full px-4 text-sm font-semibold transition-colors",
                    ativo
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-navy-900">Segmento</h3>
          <div className="flex flex-col gap-2">
            {SEGMENTOS_OPCOES.map((seg) => {
              const ativo = value.segmentos.includes(seg);
              return (
                <label
                  key={seg}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-50"
                >
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={() => toggleSegmento(seg)}
                    className="size-4 accent-blue-600"
                  />
                  <span className="text-[15px] text-navy-900">{seg}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-navy-900">Passivo estimado (R$)</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mínimo" htmlFor="passivo-min">
              <TextInput
                id="passivo-min"
                inputMode="numeric"
                placeholder="0"
                value={value.passivoMin}
                onChange={(e) => onChange({ ...value, passivoMin: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
            <Field label="Máximo" htmlFor="passivo-max">
              <TextInput
                id="passivo-max"
                inputMode="numeric"
                placeholder="1000000"
                value={value.passivoMax}
                onChange={(e) => onChange({ ...value, passivoMax: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
          </div>
        </section>
      </div>
    </Drawer>
  );
}
