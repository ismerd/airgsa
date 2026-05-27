"use client";

import { useMemo } from "react";
import { RevenueChart, YieldChart } from "@/components/dashboard/chart-card";
import { useCurrency } from "@/lib/currency-context";
import type { KpiPoint } from "@/lib/types";

export function ChartSection({ allData }: { allData: KpiPoint[] }) {
  const { currency } = useCurrency();

  const convertedData = useMemo(() => {
    if (currency.rate === 1) return allData;
    return allData.map((p) => ({
      ...p,
      revenue: Math.round(p.revenue * currency.rate),
      yield: Math.round(p.yield * currency.rate * 100) / 100,
    }));
  }, [allData, currency]);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <RevenueChart
        data={convertedData}
        currencySymbol={currency.symbol}
        currencyCode={currency.code}
      />
      <YieldChart
        data={convertedData}
        currencySymbol={currency.symbol}
        currencyCode={currency.code}
      />
    </div>
  );
}
