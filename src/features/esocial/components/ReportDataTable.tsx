import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ReportColumn<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
};

export function ReportDataTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage = "Nenhum registro nesta aba.",
  dense = false,
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  dense?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm text-ink-muted">{emptyMessage}</p>
    );
  }

  return (
    <table
      className={cn(
        "w-full min-w-[960px] border-collapse text-left",
        dense ? "text-sm" : "text-sm",
      )}
    >
      <thead>
        <tr className="bg-surface-50">
          {columns.map((col) => (
            <th
              key={col.key}
              className={cn(
                "sticky top-0 z-10 border-b border-border bg-surface-50 px-3 py-3 text-xs font-bold tracking-wide whitespace-nowrap text-navy-900 uppercase",
              )}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-border hover:bg-surface-50">
            {columns.map((col) => (
              <td
                key={col.key}
                className={cn("px-3 py-3 align-middle text-navy-900", col.className)}
              >
                {col.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
