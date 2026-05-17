"use client";

import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CountryPerformance } from "@/lib/airline-performance-data";
import { useCurrency } from "@/lib/currency-context";

const CountryPerformanceWorldLeaflet = dynamic(
  () =>
    import("@/components/dashboard/country-performance-world-leaflet").then(
      (module) => module.CountryPerformanceWorldLeaflet,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[520px] items-center justify-center bg-surface2 text-sm text-ink-muted">
        Loading country map...
      </div>
    ),
  },
);

type CountryPerformanceWorldMapProps = {
  countries: CountryPerformance[];
  selectedCountry?: string;
  periodLabel: string;
  onCountrySelect: (country: string) => void;
};

export function CountryPerformanceWorldMap({
  countries,
  selectedCountry,
  periodLabel,
  onCountrySelect,
}: CountryPerformanceWorldMapProps) {
  const selected = countries.find((c) => c.country === selectedCountry);

  return (
    <Card className="isolate overflow-hidden">
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Country performance world map</CardTitle>
          <p className="mt-1 text-sm text-ink-muted">
            Highlighted countries have commercial KPI data for the selected {periodLabel.toLowerCase()} view.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border-ui px-3 py-1.5 text-xs text-ink-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          Countries with data
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative overflow-hidden rounded-md border border-border-ui bg-surface2 min-h-[520px]">
          <CountryPerformanceWorldLeaflet
            countries={countries}
            selectedCountry={selectedCountry}
            onCountrySelect={onCountrySelect}
          />

          {selected && (
            <aside className="absolute right-3 top-3 bottom-3 z-[1000] w-[280px] overflow-y-auto rounded-lg border border-border-ui bg-surface/95 p-4 shadow-xl backdrop-blur-sm">
              <button
                onClick={() => onCountrySelect("")}
                className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:bg-black/10 hover:text-ink"
                aria-label="Close"
              >
                ×
              </button>
              <CountryStats country={selected} />
              <div className="mt-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  <MapPinned className="h-3.5 w-3.5" />
                  All data countries
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {countries.map((c) => (
                    <button
                      key={c.country}
                      onClick={() => onCountrySelect(c.country)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition hover:text-ink ${
                        c.country === selectedCountry
                          ? "border-brand/60 bg-brand/10 text-ink"
                          : "border-border-ui text-ink-muted hover:border-brand/40"
                      }`}
                      type="button"
                    >
                      {c.country}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CountryStats({ country }: { country: CountryPerformance }) {
  const { currency } = useCurrency();
  const { symbol, rate } = currency;
  const fmt = (v: number) => `${symbol}${Math.round(v * rate).toLocaleString("en-US")}`;

  return (
    <div className="mb-3">
      <div className="rounded-md border border-border-ui bg-surface p-4">
        <p className="pr-6 text-sm font-semibold text-ink">{country.country}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{country.region}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Detail label="Revenue" value={fmt(country.revenue)} />
          <Detail label="Yield / kg" value={`${symbol}${(country.yieldPerKg * rate).toFixed(2)}`} />
          <Detail label="Loadfactor" value={`${country.loadFactor}%`} />
          <Detail label="Tonnage" value={`${country.tonnage.toFixed(1)} t`} />
          <Detail label="Top lane" value={country.topLane} />
        </div>
      </div>

      {country.airports.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Airport breakdown
          </p>
          <div className="space-y-1.5">
            {country.airports.map((airport) => (
              <div
                key={airport.airportCode}
                className="rounded-md border border-border-ui bg-surface px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand">{airport.airportCode}</span>
                    <span className="text-xs text-ink-muted">{airport.city}</span>
                  </div>
                  <span className="text-xs text-ink-muted">{airport.flightCount} flt</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">{fmt(airport.revenue)}</span>
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <span>{symbol}{(airport.yieldPerKg * rate).toFixed(2)}/kg</span>
                    <span className="font-medium text-ink">{airport.loadFactor}%</span>
                  </div>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full rounded-full bg-brand/60"
                    style={{ width: `${Math.round(airport.revenue / country.revenue * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-ink">{value}</p>
    </div>
  );
}
