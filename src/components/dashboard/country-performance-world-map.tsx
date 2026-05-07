"use client";

import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CountryPerformance } from "@/lib/airline-performance-data";
import { formatCurrency } from "@/lib/utils";

const CountryPerformanceWorldLeaflet = dynamic(
  () =>
    import("@/components/dashboard/country-performance-world-leaflet").then(
      (module) => module.CountryPerformanceWorldLeaflet,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[390px] items-center justify-center bg-surface2 text-sm text-ink-muted">
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
  const selected = countries.find((country) => country.country === selectedCountry);

  return (
    <Card className="overflow-hidden">
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
        <div className="grid overflow-hidden rounded-md border border-border-ui bg-surface2 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative min-h-[390px]">
            <CountryPerformanceWorldLeaflet
              countries={countries}
              selectedCountry={selectedCountry}
              onCountrySelect={onCountrySelect}
            />
          </div>
          <aside className="border-t border-border-ui bg-surface p-4 xl:border-l xl:border-t-0">
            {selected ? <CountryStats country={selected} /> : <EmptyCountryStats />}
            <div className="mt-5 rounded-md border border-border-ui bg-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <MapPinned className="h-4 w-4 text-brand" />
                Visible data countries
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {countries.map((country) => (
                  <button
                    key={country.country}
                    className="rounded-full border border-border-ui px-2.5 py-1 text-xs text-ink-muted transition hover:border-brand/50 hover:text-ink"
                    type="button"
                    onClick={() => onCountrySelect(country.country)}
                  >
                    {country.country}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function CountryStats({ country }: { country: CountryPerformance }) {
  return (
    <div className="rounded-md border border-border-ui bg-surface p-4">
      <p className="text-sm font-semibold text-ink">{country.country}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{country.region}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Detail label="Revenue" value={formatCurrency(country.revenue)} />
        <Detail label="Yield / kg" value={`$${country.yieldPerKg.toFixed(2)}`} />
        <Detail label="Loadfactor" value={`${country.loadFactor}%`} />
        <Detail label="Tonnage" value={`${country.tonnage.toFixed(1)} t`} />
        <Detail label="Top lane" value={country.topLane} />
      </div>
    </div>
  );
}

function EmptyCountryStats() {
  return (
    <div className="rounded-md border border-dashed border-border-ui bg-surface p-4">
      <p className="text-sm font-semibold text-ink">No country selected</p>
      <p className="mt-1 text-xs text-ink-muted">Click a highlighted country to inspect its KPI values.</p>
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
