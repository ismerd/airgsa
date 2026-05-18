"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import { Globe, Mail, ExternalLink, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GsaRecord } from "@/components/dashboard/gsa-network-leaflet";

const GsaNetworkLeaflet = dynamic(
  () =>
    import("@/components/dashboard/gsa-network-leaflet").then(
      (m) => m.GsaNetworkLeaflet,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[520px] items-center justify-center bg-surface2 text-sm text-ink-muted">
        Loading map...
      </div>
    ),
  },
);

function GsaListItem({ gsa }: { gsa: GsaRecord }) {
  const websiteHref = gsa.website
    ? gsa.website.startsWith("http") ? gsa.website : `https://${gsa.website}`
    : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-ui bg-surface p-4 transition hover:border-brand/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{gsa.name}</p>
          {gsa.hq && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
              <MapPin className="h-3 w-3 shrink-0" />
              {gsa.hq}{gsa.branch ? ` · ${gsa.branch}` : ""}
            </div>
          )}
        </div>
        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-ink-muted transition hover:text-brand"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {(gsa.contact || gsa.email) && (
        <div className="space-y-1.5 border-t border-border-ui pt-2.5">
          {gsa.contact && (
            <p className="text-xs text-ink-muted">{gsa.contact}</p>
          )}
          {gsa.email && (
            <a
              href={`mailto:${gsa.email}`}
              className="flex items-center gap-1.5 text-xs text-ink-muted transition hover:text-brand"
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{gsa.email}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  gsas: GsaRecord[];
  totalCountries: number;
};

export function GsaNetworkMap({ gsas, totalCountries }: Props) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const selectedGsas = useMemo(
    () => (selectedCountry ? gsas.filter((g) => g.geoCountry === selectedCountry) : []),
    [gsas, selectedCountry],
  );

  const onCountrySelect = (country: string | null) => setSelectedCountry(country);

  return (
    <Card className="isolate overflow-hidden">
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>GSA Partner Network</CardTitle>
          <p className="mt-1 text-sm text-ink-muted">
            {gsas.length} partners across {totalCountries} countries · click a country to explore
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border-ui px-3 py-1.5 text-xs text-ink-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          Countries with GSAs
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="relative overflow-hidden rounded-md border border-border-ui bg-surface2 min-h-[520px]">
          <GsaNetworkLeaflet
            gsas={gsas}
            selectedCountry={selectedCountry}
            onCountrySelect={onCountrySelect}
          />
        </div>

        {selectedCountry ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">{selectedCountry}</h2>
                <p className="text-sm text-ink-muted">
                  {selectedGsas.length} GSA partner{selectedGsas.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCountry(null)}
                className="rounded-full border border-border-ui px-3 py-1.5 text-xs text-ink-muted transition hover:border-brand/40 hover:text-ink"
              >
                Clear selection
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {selectedGsas.map((gsa) => (
                <GsaListItem key={gsa.name} gsa={gsa} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border-ui bg-surface px-6 py-10 text-center">
            <div>
              <Globe className="mx-auto mb-3 h-8 w-8 text-ink-muted/40" />
              <p className="text-sm font-medium text-ink-muted">Select a country on the map</p>
              <p className="mt-1 text-xs text-ink-muted/70">Highlighted countries have registered GSA partners</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
