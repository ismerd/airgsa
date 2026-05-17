"use client";

import { useMemo } from "react";
import { RevenueChart, YieldChart } from "@/components/dashboard/chart-card";
import { useCurrency } from "@/lib/currency-context";
import { usePeriod } from "@/lib/period-context";
import type { KpiPoint } from "@/lib/types";

export function ChartSection({ allData, filterByPeriod = true }: { allData: KpiPoint[]; filterByPeriod?: boolean }) {
  const { currency } = useCurrency();
  const { kpiPeriod, kpiCustomStart, kpiCustomEnd } = usePeriod();

  const filteredData = useMemo(() => {
    if (!filterByPeriod) {
      return currency.rate === 1
        ? allData
        : allData.map((p) => ({
            ...p,
            revenue: Math.round(p.revenue * currency.rate),
            yield: Math.round(p.yield * currency.rate * 100) / 100,
          }));
    }

    let data: KpiPoint[];
    if (kpiPeriod === "ytd") {
      data = allData.filter((p) => p.date >= "2026-01");
    } else if (kpiPeriod === "fy") {
      data = allData.filter((p) => p.date >= "2025-04" && p.date <= "2026-03");
    } else {
      data = allData.filter((p) => p.date >= kpiCustomStart && p.date <= kpiCustomEnd);
    }

    if (currency.rate === 1) return data;
    return data.map((p) => ({
      ...p,
      revenue: Math.round(p.revenue * currency.rate),
      yield: Math.round(p.yield * currency.rate * 100) / 100,
    }));
  }, [allData, filterByPeriod, kpiPeriod, currency, kpiCustomStart, kpiCustomEnd]);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <RevenueChart
        data={filteredData}
        currencySymbol={currency.symbol}
        currencyCode={currency.code}
      />
      <YieldChart
        data={filteredData}
        currencySymbol={currency.symbol}
        currencyCode={currency.code}
      />
    </div>
  );
}
