"use client";

import { useMemo, useState } from "react";
import { CountryPerformanceChart, GsaPerformanceChart } from "@/components/dashboard/chart-card";
import { CountryPerformanceWorldMap } from "@/components/dashboard/country-performance-world-map";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  countryPerformanceByPeriod,
  type CountryPerformance,
  gsaPerformanceByPeriod,
  type GsaPerformance,
  periodAveragePerformance,
  type PerformancePeriod,
  performancePeriodOptions,
} from "@/lib/airline-performance-data";
import { cn, formatCurrency } from "@/lib/utils";

const countryColumns: Column<CountryPerformance>[] = [
  {
    header: "Country",
    cell: (row) => (
      <div>
        <p className="font-semibold text-white">{row.country}</p>
        <p className="text-xs text-slate-500">{row.region}</p>
      </div>
    ),
  },
  { header: "Revenue", cell: (row) => formatCurrency(row.revenue), className: "font-semibold text-white" },
  { header: "Yield / kg", cell: (row) => `$${row.yieldPerKg.toFixed(2)}` },
  { header: "Loadfactor", cell: (row) => `${row.loadFactor}%` },
  { header: "Tonnage", cell: (row) => `${row.tonnage.toFixed(1)} t` },
  { header: "Top lane", cell: (row) => row.topLane },
];

const gsaColumns: Column<GsaPerformance>[] = [
  {
    header: "GSA",
    cell: (row) => (
      <div>
        <p className="font-semibold text-white">{row.gsaName}</p>
        <p className="text-xs text-slate-500">{row.assignedMarkets}</p>
      </div>
    ),
  },
  { header: "Revenue", cell: (row) => formatCurrency(row.revenue), className: "font-semibold text-white" },
  { header: "Yield / kg", cell: (row) => `$${row.yieldPerKg.toFixed(2)}` },
  { header: "Loadfactor", cell: (row) => `${row.loadFactor}%` },
  { header: "Tonnage", cell: (row) => `${row.tonnage.toFixed(1)} t` },
  { header: "Flights", cell: (row) => row.flightCount },
];

export function AirlinePerformancePeriodPanel() {
  const [selectedPeriod, setSelectedPeriod] = useState<PerformancePeriod>("monthly");
  const [selectedCountry, setSelectedCountry] = useState<string>();
  const countries = countryPerformanceByPeriod[selectedPeriod];
  const gsas = gsaPerformanceByPeriod[selectedPeriod];
  const selectedAverage = periodAveragePerformance.find((period) => period.period === selectedPeriod)!;
  const countryTotals = useMemo(() => getCountryTotals(countries), [countries]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Commercial performance period</CardTitle>
            <p className="mt-1 text-sm text-slate-400">
              Switch country and GSA KPIs between daily, weekly, monthly, and yearly views.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-slate-950/70 p-1 sm:flex">
            {performancePeriodOptions.map((period) => (
              <Button
                key={period.id}
                className={cn("justify-start", selectedPeriod === period.id && "bg-cyan-400 text-slate-950 hover:bg-cyan-300")}
                size="sm"
                type="button"
                variant={selectedPeriod === period.id ? "default" : "ghost"}
                onClick={() => setSelectedPeriod(period.id)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <Metric label={`${selectedAverage.label} revenue`} value={formatCurrency(selectedAverage.revenue)} />
          <Metric label="Country revenue" value={formatCurrency(countryTotals.revenue)} />
          <Metric label="Yield / kg" value={`$${selectedAverage.yieldPerKg.toFixed(2)}`} />
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
    <div className="rounded-md border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
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
