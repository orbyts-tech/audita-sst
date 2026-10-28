import { useState } from "react";
import { useParams } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useEsocial } from "../EsocialProvider";

const ABAS = ["Parâmetros", "Contribuições", "Obrigação acessória", "Memória de cálculo"] as const;

export function EsocialSatRatPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { getFinancial } = useEsocial();
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Contribuições");
  const items = getFinancial(id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              aba === a ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700",
            )}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-surface-0 p-5 shadow-card">
        <h2 className="text-lg font-bold text-navy-900">{aba}</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Valores são estimativas com memória de cálculo — não autuação nem dívida reconhecida.
          Sem remuneração autorizada: status <strong>indisponível</strong>, nunca zero.
        </p>

        <ul className="mt-6 divide-y divide-border">
          {items.map((item) => (
            <li key={item.component} className="py-4">
              <div className="font-semibold text-navy-900">{item.component}</div>
              <div
                className={cn(
                  "mt-1 text-sm font-semibold",
                  item.status === "disponivel" ? "text-success-600" : "text-warning-600",
                )}
              >
                {item.status === "disponivel"
                  ? `Disponível${item.amount != null ? `: ${item.amount}` : ""}`
                  : "Cálculo indisponível por ausência de dados"}
              </div>
              {item.reason && <p className="mt-1 text-sm text-ink-muted">{item.reason}</p>}
            </li>
          ))}
        </ul>

        {aba === "Memória de cálculo" && (
          <p className="mt-4 rounded-md bg-surface-50 p-4 text-sm text-ink-muted">
            Quando habilitado: insumos, fórmula versionada, fundamento legal e vigência. Pipeline
            financeiro preparado após etapa 6 do roadmap.
          </p>
        )}
      </div>
    </div>
  );
}
