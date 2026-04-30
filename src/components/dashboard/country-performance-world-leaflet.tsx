"use client";

import L from "leaflet";
import countriesAtlas from "world-atlas/countries-110m.json";
import { feature } from "topojson-client";
import { useEffect, useMemo } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import type { CountryPerformance } from "@/lib/airline-performance-data";
import { formatCurrency } from "@/lib/utils";

type CountryPerformanceWorldLeafletProps = {
  countries: CountryPerformance[];
  selectedCountry?: string;
  onCountrySelect: (country: string) => void;
};

const mapBounds: L.LatLngBoundsExpression = [
  [-58, -180],
  [75, 180],
];

const worldCountries = feature(
  countriesAtlas as never,
  (countriesAtlas as { objects: { countries: unknown } }).objects.countries as never,
) as unknown as FeatureCollection<Geometry, { name: string }>;

export function CountryPerformanceWorldLeaflet({
  countries,
  selectedCountry,
  onCountrySelect,
}: CountryPerformanceWorldLeafletProps) {
  const maxRevenue = Math.max(...countries.map((country) => country.revenue), 1);
  const countryDataByName = useMemo(() => new Map(countries.map((country) => [country.country, country])), [countries]);
  const visibleCountryFeatures = useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features: worldCountries.features.filter((country) => countryDataByName.has(country.properties.name)),
      }) satisfies FeatureCollection<Geometry, { name: string }>,
    [countryDataByName],
  );

  return (
    <MapContainer
      className="performance-country-map h-full min-h-[390px] w-full"
      center={[31, 35]}
      maxBounds={mapBounds}
      maxZoom={6}
      minZoom={2}
      scrollWheelZoom
      worldCopyJump
      zoom={2}
    >
      <CountryMapResizeObserver watchKey={`${selectedCountry ?? "none"}-${countries.length}`} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <GeoJSON
        key={`${selectedCountry ?? "none"}-${countries.map((country) => country.country).join("-")}`}
        data={visibleCountryFeatures}
        onEachFeature={(countryFeature, layer) => {
          const country = countryDataByName.get(countryFeature.properties.name);

          if (!country) return;

          layer.on({ click: () => onCountrySelect(country.country) });
          layer.bindTooltip(
            `<div><p class="font-semibold">${country.country}</p><p>${formatCurrency(country.revenue)}</p></div>`,
            { direction: "top", opacity: 0.96, sticky: true },
          );
        }}
        style={(countryFeature) => {
          const country = countryFeature ? countryDataByName.get(countryFeature.properties.name) : undefined;
          const isSelected = country?.country === selectedCountry;
          const revenueWeight = country ? country.revenue / maxRevenue : 0;
          const color = isSelected ? "#facc15" : "#38bdf8";

          return {
            color,
            fillColor: color,
            fillOpacity: isSelected ? 0.72 : 0.22 + revenueWeight * 0.34,
            opacity: isSelected ? 1 : 0.9,
            weight: isSelected ? 2.5 : 1.4,
          };
        }}
      />
    </MapContainer>
  );
}

function CountryMapResizeObserver({ watchKey }: { watchKey: string }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const invalidateMapSize = () => {
      window.requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    };
    const observer = new ResizeObserver(invalidateMapSize);

    observer.observe(container);
    invalidateMapSize();

    return () => observer.disconnect();
  }, [map, watchKey]);

  return null;
}
