import type React from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({ columns, data }: { columns: Column<T>[]; data: T[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-ui">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border-ui bg-surface2">
            <tr>
              {columns.map((column) => (
                <th key={column.header} className={cn("px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-ui">
            {data.map((row, index) => (
              <tr key={index} className="bg-surface text-ink transition-colors duration-100 hover:bg-surface2">
                {columns.map((column) => (
                  <td key={column.header} className={cn("px-4 py-3.5 align-middle text-sm", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
