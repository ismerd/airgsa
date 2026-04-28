import type React from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({ columns, data }: { columns: Column<T>[]; data: T[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column.header} className={cn("px-4 py-3 font-semibold", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {data.map((row, index) => (
              <tr key={index} className="bg-slate-950/30 text-slate-200">
                {columns.map((column) => (
                  <td key={column.header} className={cn("px-4 py-4 align-middle", column.className)}>
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
