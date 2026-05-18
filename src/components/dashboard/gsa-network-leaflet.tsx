"use client";

import countriesAtlas from "world-atlas/countries-110m.json";
import { feature } from "topojson-client";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { FeatureCollection, Geometry } from "geojson";

export type GsaRecord = {
  name: string;
  country: string;
  hq: string;
  contact: string;
  email: string;
  website: string;
  branch: string;
  network: string;
  geoCountry: string;
};

type Props = {
  gsas: GsaRecord[];
  selectedCountry: string | null;
  onCountrySelect: (country: string | null) => void;
};

function useDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// Fix polygons that cross the antimeridian (Russia, Fiji etc.)
function fixRing(ring: number[][]): number[][] {
  const lons = ring.map((p) => p[0]);
  const sorted = [...lons].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return ring.map((p) => {
    if (p[0] - median > 180) return [p[0] - 360, p[1]];
    if (median - p[0] > 180) return [p[0] + 360, p[1]];
    return p;
  });
}

function fixGeometry(geometry: { type: string; coordinates: unknown }) {
  if (geometry.type === "Polygon") {
    return { ...geometry, coordinates: (geometry.coordinates as number[][][]).map(fixRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return { ...geometry, coordinates: (geometry.coordinates as number[][][][]).map((poly) => poly.map(fixRing)) };
  }
  return geometry;
}

const worldCountries = (() => {
  const fc = feature(
    countriesAtlas as never,
    (countriesAtlas as { objects: { countries: unknown } }).objects.countries as never,
  ) as unknown as FeatureCollection<Geometry, { name: string }>;
  return {
    ...fc,
    features: fc.features.map((f) => ({
      ...f,
      geometry: fixGeometry(f.geometry as { type: string; coordinates: unknown }) as typeof f.geometry,
    })),
  };
})();

export function GsaNetworkLeaflet({ gsas, selectedCountry, onCountrySelect }: Props) {
  const isDark = useDarkMode();
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const countryGsas = useMemo(() => {
    const m = new Map<string, GsaRecord[]>();
    for (const gsa of gsas) {
      if (!gsa.geoCountry) continue;
      const list = m.get(gsa.geoCountry) ?? [];
      list.push(gsa);
      m.set(gsa.geoCountry, list);
    }
    return m;
  }, [gsas]);

  const gsaCountryFeatures = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: worldCountries.features.filter((f) => countryGsas.has(f.properties.name)),
    }),
    [countryGsas],
  );

  return (
    <MapContainer
      className="gsa-network-map h-full min-h-[520px] w-full"
      center={[31, 35]}
      zoom={2}
      minZoom={2}
      maxZoom={6}
      scrollWheelZoom
      worldCopyJump
    >
      <MapResizeObserver watchKey={`${selectedCountry ?? "none"}-${gsas.length}`} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={tileUrl}
        key={tileUrl}
      />
      <GeoJSON
        key={`${selectedCountry ?? "none"}-${gsas.length}`}
        data={gsaCountryFeatures}
        onEachFeature={(countryFeature, layer) => {
          const name = countryFeature.properties.name;
          const count = countryGsas.get(name)?.length ?? 0;
          layer.on({ click: () => onCountrySelect(selectedCountry === name ? null : name) });
          layer.bindTooltip(
            `<div><p class="font-semibold">${name}</p><p>${count} GSA partner${count !== 1 ? "s" : ""}</p></div>`,
            { direction: "top", opacity: 0.96, sticky: true },
          );
        }}
        style={(countryFeature) => {
          const isSelected = countryFeature?.properties.name === selectedCountry;
          const color = isSelected ? "#facc15" : "#38bdf8";
          return {
            color,
            fillColor: color,
            fillOpacity: isSelected ? 0.72 : 0.28,
            opacity: isSelected ? 1 : 0.9,
            weight: isSelected ? 2.5 : 1.4,
          };
        }}
      />
    </MapContainer>
  );
}

function MapResizeObserver({ watchKey }: { watchKey: string }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => window.requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    const observer = new ResizeObserver(invalidate);
    observer.observe(container);
    invalidate();
    return () => observer.disconnect();
  }, [map, watchKey]);
  return null;
}
