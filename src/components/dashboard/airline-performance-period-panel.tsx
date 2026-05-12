"use client";

import React, { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { CountryPerformanceChart, GsaPerformanceChart } from "@/components/dashboard/chart-card";
import { ChartSection } from "@/components/dashboard/chart-section";
import { CountryPerformanceWorldMap } from "@/components/dashboard/country-performance-world-map";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type CountryPerformance, type GsaPerformance } from "@/lib/airline-performance-data";
import { formatMoney, useCurrency } from "@/lib/currency-context";
import { usePeriod } from "@/lib/period-context";
import type { KpiPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AirlinePerformancePeriodPanel({ kpiData }: { kpiData: KpiPoint[] }) {
  const { currency } = useCurrency();
  const { symbol, rate } = currency;
  const fmt = (v: number) => formatMoney(v, symbol, rate);

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
      <CountryPerformanceWorldMap
        countries={countries}
        periodLabel={selectedAverage.label}
        selectedCountry={selectedCountry}
        onCountrySelect={(country) => setSelectedCountry((current) => (current === country ? undefined : country))}
      />

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

      <ChartSection allData={kpiData} />

      <div className="grid gap-5 xl:grid-cols-2">
        <CountryPerformanceChart data={countries} />
        <GsaPerformanceChart data={gsas} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Country-level commercial performance</CardTitle>
        </CardHeader>
        <CardContent>
          <CountryExpandableTable countries={countries} fmt={fmt} symbol={symbol} rate={rate} />
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

function CountryExpandableTable({
  countries,
  fmt,
  symbol,
  rate,
}: {
  countries: CountryPerformance[];
  fmt: (v: number) => string;
  symbol: string;
  rate: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedAirports, setExpandedAirports] = useState<Set<string>>(new Set());

  const toggle = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleAirport = (airportCode: string) => {
    setExpandedAirports((prev) => {
      const next = new Set(prev);
      if (next.has(airportCode)) next.delete(airportCode);
      else next.add(airportCode);
      return next;
    });
  };

  const headers = ["Country", "Revenue", "Yield / kg", "Loadfactor", "Tonnage"];

  return (
    <div className="overflow-hidden rounded-lg border border-border-ui">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-ui">
            {countries.map((country) => {
              const isOpen = expanded.has(country.code);
              const hasAirports = country.airports.length > 0;
              return (
                <React.Fragment key={country.code}>
                  <tr
                    className={cn(
                      "bg-page text-ink-muted transition-colors",
                      hasAirports && "cursor-pointer hover:bg-surface2/60",
                    )}
                    onClick={() => hasAirports && toggle(country.code)}
                  >
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center gap-2">
                        {hasAirports ? (
                          <ChevronRight
                            className={cn("h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-200", isOpen && "rotate-90")}
                          />
                        ) : (
                          <span className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-ink">{country.country}</p>
                          <p className="text-xs text-ink-muted">{country.region}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle font-semibold text-ink">{fmt(country.revenue)}</td>
                    <td className="px-4 py-4 align-middle">{symbol}{(country.yieldPerKg * rate).toFixed(2)}</td>
                    <td className="px-4 py-4 align-middle">{country.loadFactor}%</td>
                    <td className="px-4 py-4 align-middle">{country.tonnage.toFixed(1)} t</td>
                  </tr>

                  {isOpen && country.airports.map((airport, i) => {
                    const airportOpen = expandedAirports.has(airport.airportCode);
                    const routes = [...airport.routes].sort((a, b) => b.revenue - a.revenue);
                    const hasRoutes = routes.length > 0;

                    return (
                      <React.Fragment key={airport.airportCode}>
                        <tr
                          className={cn(
                            "bg-surface2/40 text-ink-muted transition-colors",
                            hasRoutes && "cursor-pointer hover:bg-surface2",
                          )}
                          onClick={() => hasRoutes && toggleAirport(airport.airportCode)}
                        >
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-center gap-2 pl-5">
                              <div className="flex flex-col items-center self-stretch">
                                <div className="w-px flex-1 bg-border-ui" />
                                {i === country.airports.length - 1 && <div className="h-0" />}
                              </div>
                              {hasRoutes ? (
                                <ChevronRight
                                  className={cn("ml-1 h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-200", airportOpen && "rotate-90")}
                                />
                              ) : (
                                <span className="ml-1 h-3.5 w-3.5 shrink-0" />
                              )}
                              <div className="ml-1">
                                <p className="font-mono text-xs font-bold tracking-wider text-brand">{airport.airportCode}</p>
                                <p className="text-xs text-ink-muted">{airport.city}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle text-xs font-semibold text-ink">
                            {fmt(airport.revenue)}
                            <p className="font-normal text-ink-muted">{Math.round(airport.revenue / country.revenue * 100)}% of country</p>
                          </td>
                          <td className="px-4 py-3 align-middle text-xs">{symbol}{(airport.yieldPerKg * rate).toFixed(2)}</td>
                          <td className="px-4 py-3 align-middle text-xs">{airport.loadFactor}%</td>
                          <td className="px-4 py-3 align-middle text-xs">
                            {airport.tonnage.toFixed(1)} t
                            <p className="text-ink-muted">{airport.flightCount} flights</p>
                          </td>
                        </tr>

                        {airportOpen && routes.map((route, routeIndex) => (
                          <tr key={route.route} className="bg-surface text-ink-muted">
                            <td className="px-4 py-2.5 align-middle">
                              <div className="flex items-center gap-2 pl-14">
                                <span className="h-px w-5 bg-border-ui" />
                                <div>
                                  <p className="font-mono text-xs font-bold text-ink">{route.route}</p>
                                  <p className="text-[11px] text-ink-muted">Rank #{routeIndex + 1} from {airport.city}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 align-middle text-xs font-semibold text-ink">
                              {fmt(route.revenue)}
                              <p className="font-normal text-ink-muted">{Math.round(route.revenue / airport.revenue * 100)}% of city</p>
                            </td>
                            <td className="px-4 py-2.5 align-middle text-xs">{symbol}{(route.yieldPerKg * rate).toFixed(2)}</td>
                            <td className="px-4 py-2.5 align-middle text-xs">{route.loadFactor}%</td>
                            <td className="px-4 py-2.5 align-middle text-xs">
                              {route.tonnage.toFixed(1)} t
                              <p className="text-ink-muted">{route.flightCount} flights</p>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
