"use client";

import { useMemo, useState } from "react";
import { RevenueChart, YieldChart } from "@/components/dashboard/chart-card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CURRENCIES, useCurrency } from "@/lib/currency-context";
import type { KpiPoint } from "@/lib/types";

type Period = "ytd" | "fy" | "custom";

function formatMonthLabel(date: string): string {
  const [y, m] = date.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function ChartSection({ allData }: { allData: KpiPoint[] }) {
  const [period, setPeriod] = useState<Period>("ytd");
  const [customStart, setCustomStart] = useState(allData[0]?.date ?? "");
  const [customEnd, setCustomEnd] = useState(allData[allData.length - 1]?.date ?? "");

  const { currency, setCurrencyCode } = useCurrency();
  const currencyCode = currency.code;

  const filteredData = useMemo(() => {
    let data: KpiPoint[];
    if (period === "ytd") {
      data = allData.filter((p) => p.date >= "2026-01");
    } else if (period === "fy") {
      data = allData.filter((p) => p.date >= "2025-04" && p.date <= "2026-03");
    } else {
      data = allData.filter((p) => p.date >= customStart && p.date <= customEnd);
    }

    if (currency.rate === 1) return data;
    return data.map((p) => ({
      ...p,
      revenue: Math.round(p.revenue * currency.rate),
      yield: Math.round(p.yield * currency.rate * 100) / 100,
    }));
  }, [allData, period, currency, customStart, customEnd]);

  const periodControls = (
    <div className="flex flex-col items-end gap-2">
      <div className="flex rounded-lg border border-white/10 bg-slate-900/60 p-0.5">
        {(["ytd", "fy", "custom"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition-colors",
              period === p
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            {p === "ytd" ? "YTD" : p === "fy" ? "FY" : "Custom"}
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex items-center gap-1.5">
          <Select
            className="h-7 w-[120px] text-xs"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value);
              if (e.target.value > customEnd) setCustomEnd(e.target.value);
            }}
          >
            {allData.map((p) => (
              <option key={p.date} value={p.date}>
                {formatMonthLabel(p.date)}
              </option>
            ))}
          </Select>
          <span className="text-xs text-slate-500">–</span>
          <Select
            className="h-7 w-[120px] text-xs"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          >
            {allData
              .filter((p) => p.date >= customStart)
              .map((p) => (
                <option key={p.date} value={p.date}>
                  {formatMonthLabel(p.date)}
                </option>
              ))}
          </Select>
        </div>
      )}
    </div>
  );

  const currencyControl = (
    <Select
      className="h-8 w-24 text-xs"
      value={currencyCode}
      onChange={(e) => setCurrencyCode(e.target.value)}
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code}
        </option>
      ))}
    </Select>
  );

  // Remove local currency from filteredData computation — currency applied via context

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <RevenueChart
        data={filteredData}
        currencySymbol={currency.symbol}
        currencyCode={currency.code}
        headerControls={periodControls}
      />
      <YieldChart
        data={filteredData}
        currencySymbol={currency.symbol}
        currencyCode={currency.code}
        headerControls={currencyControl}
      />
    </div>
  );
}
