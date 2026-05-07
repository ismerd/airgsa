"use client";

import { useMemo, useState } from "react";
import { CountryPerformanceChart, GsaPerformanceChart } from "@/components/dashboard/chart-card";
import { CountryPerformanceWorldMap } from "@/components/dashboard/country-performance-world-map";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type CountryPerformance, type GsaPerformance } from "@/lib/airline-performance-data";
import { CURRENCIES, formatMoney, useCurrency } from "@/lib/currency-context";
import { usePeriod } from "@/lib/period-context";
import { cn } from "@/lib/utils";

export function AirlinePerformancePeriodPanel() {
  const { currency } = useCurrency();
  const { symbol, rate } = currency;
  const fmt = (v: number) => formatMoney(v, symbol, rate);

  const resolveCurrency = (localCode: string) => {
    const local = CURRENCIES.find((c) => c.code === localCode);
    return local ?? currency;
  };

  const countryColumns: Column<CountryPerformance>[] = [
    {
      header: "Country",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.country}</p>
          <p className="text-xs text-ink-muted">{row.region}</p>
        </div>
      ),
    },
    {
      header: "Revenue",
      className: "font-semibold text-ink",
      cell: (row) => {
        const cur = resolveCurrency(row.localCurrencyCode);
        return (
          <span className="flex items-center gap-1.5">
            {formatMoney(row.revenue, cur.symbol, cur.rate)}
            {cur.code !== currency.code && (
              <span className="rounded bg-surface2 px-1 py-0.5 text-[10px] font-medium text-ink-muted">
                {cur.code}
              </span>
            )}
          </span>
        );
      },
    },
    {
      header: "Yield / kg",
      cell: (row) => {
        const cur = resolveCurrency(row.localCurrencyCode);
        return (
          <span className="flex items-center gap-1.5">
            {cur.symbol}{(row.yieldPerKg * cur.rate).toFixed(2)}
            {cur.code !== currency.code && (
              <span className="rounded bg-surface2 px-1 py-0.5 text-[10px] font-medium text-ink-muted">
                {cur.code}
              </span>
            )}
          </span>
        );
      },
    },
    { header: "Loadfactor", cell: (row) => `${row.loadFactor}%` },
    { header: "Tonnage", cell: (row) => `${row.tonnage.toFixed(1)} t` },
    { header: "Top lane", cell: (row) => row.topLane },
  ];

  const gsaColumns: Column<GsaPerformance>[] = [
    {
      header: "GSA",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.gsaName}</p>
          <p className="text-xs text-ink-muted">{row.assignedMarkets}</p>
        </div>
      ),
    },
    { header: "Revenue", cell: (row) => fmt(row.revenue), className: "font-semibold text-ink" },
    { header: "Yield / kg", cell: (row) => `${symbol}${(row.yieldPerKg * rate).toFixed(2)}` },
    { header: "Loadfactor", cell: (row) => `${row.loadFactor}%` },
    { header: "Tonnage", cell: (row) => `${row.tonnage.toFixed(1)} t` },
    { header: "Flights", cell: (row) => row.flightCount },
  ];

  const { countries, gsas, selectedAverage } = usePeriod();
  const [selectedCountry, setSelectedCountry] = useState<string>();
  const countryTotals = useMemo(() => getCountryTotals(countries), [countries]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Commercial performance — {selectedAverage.label}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <Metric label="Revenue" value={fmt(selectedAverage.revenue)} />
          <Metric label="Country revenue" value={fmt(countryTotals.revenue)} />
          <Metric label="Yield / kg" value={`${symbol}${(selectedAverage.yieldPerKg * rate).toFixed(2)}`} />
          <Metric label="Loadfactor" value={`${selectedAverage.loadFactor}%`} />
          <Metric label="Flights" value={String(selectedAverage.flightCount)} />
        </CardContent>
      </Card>

      <CountryPerformanceWorldMap
        countries={countries}
        periodLabel={selectedAverage.label}
        selectedCountry={selectedCountry}
        onCountrySelect={(country) => setSelectedCountry((current) => (current === country ? undefined : country))}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <CountryPerformanceChart data={countries} />
        <GsaPerformanceChart data={gsas} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Country-level commercial performance</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={countryColumns} data={countries} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned GSA commercial performance</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={gsaColumns} data={gsas} />
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface2 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function getCountryTotals(rows: CountryPerformance[]) {
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalTonnage = rows.reduce((sum, row) => sum + row.tonnage, 0);
  const averageYield = totalTonnage === 0 ? 0 : revenue / (totalTonnage * 1000);
  const averageLoadFactor = Math.round(rows.reduce((sum, row) => sum + row.loadFactor, 0) / rows.length);

  return { revenue, averageYield, averageLoadFactor };
}
