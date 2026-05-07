"use client";

import dynamic from "next/dynamic";
import { BarChart3, DollarSign, Plane, Scale } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FlightTrackerRecord, ProductMix } from "@/lib/dummy-flight-data";
import { formatCurrency } from "@/lib/utils";

const FlightLeafletMap = dynamic(
  () => import("@/components/dashboard/flight-map-leaflet").then((module) => module.FlightLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-surface2 text-sm text-ink-muted">
        Loading flight map...
      </div>
    ),
  },
);

type FlightWorldMapProps = {
  title: string;
  subtitle: string;
  flights: FlightTrackerRecord[];
  markerColorMode: "airline" | "gsa" | "seller";
};

const productLabels: Record<keyof ProductMix, string> = {
  generalCargo: "GCR / General Cargo",
  pharma: "Pharma",
  avi: "AVI / Live Animals",
  dangerousGoods: "Dangerous Goods",
  perishables: "Perishables",
  express: "Express",
  ecommerce: "E-commerce",
  highValue: "High Value",
  seafood: "Seafood",
  automotive: "Automotive",
};

export function FlightWorldMap({ title, subtitle, flights, markerColorMode }: FlightWorldMapProps) {
  const [selectedFlightId, setSelectedFlightId] = useState<string>();

  useEffect(() => {
    setSelectedFlightId((currentFlightId) =>
      currentFlightId && flights.some((flight) => flight.id === currentFlightId) ? currentFlightId : undefined,
    );
  }, [flights]);

  const selectedFlight = flights.find((flight) => flight.id === selectedFlightId);
  const summary = useMemo(() => getFlightSummary(flights), [flights]);
  const airlineLegend = useMemo(() => getLegendItems(flights, "airline"), [flights]);
  const gsaLegend = useMemo(() => getLegendItems(flights, "gsa"), [flights]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric icon={Plane} label="Flights" value={String(summary.totalFlights)} />
            <SummaryMetric icon={Scale} label="Tonnage" value={`${summary.totalTonnage.toFixed(1)} t`} />
            <SummaryMetric icon={DollarSign} label="Revenue" value={formatCurrency(summary.totalRevenue)} />
            <SummaryMetric icon={BarChart3} label="Avg LF" value={`${summary.averageLoadFactor}%`} />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid overflow-hidden rounded-md border border-border-ui bg-surface2 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative min-h-[420px]">
            {flights.length > 0 ? (
              <FlightLeafletMap
                flights={flights}
                markerColorMode={markerColorMode}
                selectedFlightId={selectedFlightId}
                onFlightSelect={(flightId) =>
                  setSelectedFlightId((currentFlightId) => (currentFlightId === flightId ? undefined : flightId))
                }
              />
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-ink-muted">
                No flights match this dashboard context.
              </div>
            )}
          </div>

          <aside className="border-t border-border-ui bg-surface p-4 xl:border-l xl:border-t-0">
            {selectedFlight ? (
              <FlightDetails flight={selectedFlight} markerColorMode={markerColorMode} />
            ) : (
              <EmptyFlightDetails />
            )}
            <Legend title="Airlines" items={airlineLegend} />
            <Legend title="GSAs" items={gsaLegend} />
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyFlightDetails() {
  return (
    <div className="mb-5 rounded-md border border-dashed border-border-ui bg-surface p-4">
      <p className="text-sm font-semibold text-ink">No flight selected</p>
      <p className="mt-1 text-xs text-ink-muted">Click an aircraft on the map to show route and shipment statistics.</p>
    </div>
  );
}

function SummaryMetric({ icon: Icon, label, value }: { icon: typeof Plane; label: string; value: string }) {
  return (
    <div className="min-w-32 rounded-md border border-border-ui bg-surface2 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Icon className="h-3.5 w-3.5 text-brand" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function FlightDetails({
  flight,
  markerColorMode,
}: {
  flight: FlightTrackerRecord;
  markerColorMode: "airline" | "gsa" | "seller";
}) {
  const markerColor = getFlightMarkerColor(flight, markerColorMode);
  const products = Object.entries(flight.products).filter(([, value]) => Number(value) > 0) as [keyof ProductMix, number][];

  return (
    <div className="mb-5 rounded-md border border-border-ui bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: markerColor }} />
        <div>
          <p className="text-sm font-semibold text-ink">{flight.flightNumber}</p>
          <p className="text-xs text-ink-muted">
            {flight.origin.airportCode} {flight.origin.airportName} to {flight.destination.airportCode}{" "}
            {flight.destination.airportName}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Detail label="Airline" value={flight.airlineName} />
        <Detail label="GSA" value={flight.gsaName} />
        <Detail label="Tonnage" value={`${flight.tonnage.toFixed(1)} t`} />
        <Detail label="Load factor" value={`${flight.loadFactor}%`} />
        <Detail label="Revenue" value={formatCurrency(flight.revenue)} />
        <Detail label="Avg yield" value={`$${flight.averageYield.toFixed(2)}/kg`} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Product mix</p>
        <div className="mt-3 space-y-2">
          {products.map(([key, value]) => (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="text-ink-muted">{productLabels[key]}</span>
                <span className="font-semibold text-ink">{value}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: markerColor }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 font-medium text-ink">{value}</p>
    </div>
  );
}

function Legend({ title, items }: { title: string; items: { name: string; color: string }[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <div key={`${title}-${item.name}`} className="flex items-center gap-2 rounded-full border border-border-ui px-2.5 py-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-ink-muted">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getFlightSummary(flights: FlightTrackerRecord[]) {
  const totalFlights = flights.length;
  const totalTonnage = flights.reduce((sum, flight) => sum + flight.tonnage, 0);
  const totalRevenue = flights.reduce((sum, flight) => sum + flight.revenue, 0);
  const averageLoadFactor =
    totalFlights === 0 ? 0 : Math.round(flights.reduce((sum, flight) => sum + flight.loadFactor, 0) / totalFlights);

  return { totalFlights, totalTonnage, totalRevenue, averageLoadFactor };
}

function getLegendItems(flights: FlightTrackerRecord[], mode: "airline" | "gsa") {
  const items = new Map<string, string>();

  flights.forEach((flight) => {
    if (mode === "airline") {
      items.set(flight.airlineName, flight.airlineColor);
    } else {
      items.set(flight.gsaName, flight.gsaColor);
    }
  });

  return Array.from(items, ([name, color]) => ({ name, color }));
}

function getFlightMarkerColor(flight: FlightTrackerRecord, markerColorMode: "airline" | "gsa" | "seller") {
  if (markerColorMode === "seller") {
    return flight.soldBy === "gsa" ? flight.gsaColor : flight.airlineColor;
  }

  return markerColorMode === "gsa" ? flight.gsaColor : flight.airlineColor;
}
