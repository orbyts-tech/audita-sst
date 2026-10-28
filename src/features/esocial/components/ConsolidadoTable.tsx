import type { ReactNode } from "react";
import { formatCNPJ } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ConsolidadoRow, EventPresence } from "../types/report";

const COLS: { key: string; label: string; className?: string }[] = [
  { key: "#", label: "#", className: "w-10" },
  { key: "categoria", label: "Categoria", className: "w-24" },
  { key: "admissao", label: "Admissão", className: "w-28" },
  { key: "demissao", label: "Demissão", className: "w-28" },
  { key: "matricula", label: "Matrícula", className: "w-32" },
  { key: "cnpj", label: "CNPJ", className: "w-40" },
  { key: "cpf", label: "CPF", className: "w-32" },
  { key: "cbo", label: "CBO" },
  { key: "cargo", label: "Cargo" },
  { key: "nome", label: "Nome" },
  { key: "s2210", label: "S-2210", className: "w-24" },
  { key: "s2220", label: "S-2220", className: "w-24" },
  { key: "s2240", label: "S-2240", className: "w-24" },
  { key: "treinamento", label: "Treinamento", className: "w-28" },
  { key: "inconsistencias", label: "Inconsistências", className: "w-32" },
  { key: "foraPrazo", label: "Fora do prazo", className: "w-28" },
  { key: "obs", label: "Observação" },
];

function presence(value: EventPresence) {
  if (value === "nao_localizado") return "—";
  return String(value);
}

export function ConsolidadoTable({
  rows,
  startIndex = 1,
}: {
  rows: ConsolidadoRow[];
  startIndex?: number;
}) {
  return (
    <table className="w-full min-w-[1280px] table-fixed border-collapse text-left text-sm">
      <thead>
        <tr className="bg-surface-50">
          {COLS.map((col) => (
            <th
              key={col.key}
              className={cn(
                "sticky top-0 z-10 border-b border-border bg-surface-50 px-3 py-3 text-xs font-bold tracking-wide text-navy-900 uppercase",
                col.className,
              )}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id} className="border-b border-border hover:bg-surface-50">
            <Td className="tabular-nums text-ink-muted">{startIndex + i}</Td>
            <Td className="tabular-nums">{row.categoria}</Td>
            <Td className="tabular-nums">{row.admissao}</Td>
            <Td className="tabular-nums">{row.demissao ?? ""}</Td>
            <Td className="tabular-nums">{row.matricula}</Td>
            <Td>{formatCNPJ(row.cnpj)}</Td>
            <Td>{row.cpfMasked}</Td>
            <Td className="truncate" title={row.cbo}>
              {row.cbo}
            </Td>
            <Td className="truncate" title={row.cargo}>
              {row.cargo}
            </Td>
            <Td className="truncate font-semibold text-navy-900" title={row.nome}>
              {row.nome}
            </Td>
            <TdPresence value={row.s2210} label="S-2210" />
            <TdPresence value={row.s2220} label="S-2220" />
            <TdPresence value={row.s2240} label="S-2240" />
            <TdPresence value={row.treinamento} label="Treinamento" />
            <Td
              className={cn(
                "text-center tabular-nums font-semibold",
                row.inconsistencias > 0 ? "text-warning-600" : "text-success-600",
              )}
            >
              {row.inconsistencias}
            </Td>
            <Td className="text-center tabular-nums">
              {row.enviosForaPrazo == null ? "—" : row.enviosForaPrazo}
            </Td>
            <Td className="truncate text-ink-muted" title={row.observacao}>
              {row.observacao ?? ""}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Td({
  children,
  className,
  title,
}: {
  children?: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td title={title} className={cn("px-3 py-3 align-middle text-navy-900", className)}>
      {children}
    </td>
  );
}

function TdPresence({ value, label }: { value: EventPresence; label: string }) {
  const empty = value === "nao_localizado";
  return (
    <Td
      title={empty ? `${label}: não localizado no período` : `${label}: ${value}`}
      className={cn(
        "text-center",
        empty ? "text-ink-muted" : "font-semibold tabular-nums text-blue-700",
      )}
    >
      {presence(value)}
    </Td>
  );
}
