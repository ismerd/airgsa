"use client";

import dynamic from "next/dynamic";
import { BarChart3, Plane, PlaneLanding, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CargoDestination, FlightTrackerRecord, LandedAirportCluster, ProductMix } from "@/lib/flight-data-types";

const FlightLeafletMap = dynamic(
  () => import("@/components/dashboard/flight-map-leaflet").then((module) => module.FlightLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[560px] items-center justify-center bg-surface2 text-sm text-ink-muted">
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
  enableFlightTypeFilter?: boolean;
  landedAirportClusters?: LandedAirportCluster[];
};

type FlightTypeFilter = "all" | "belly" | "freighter";

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

export function FlightWorldMap({
  title,
  subtitle,
  flights,
  markerColorMode,
  enableFlightTypeFilter = false,
  landedAirportClusters = [],
}: FlightWorldMapProps) {
  const [selectedFlightId, setSelectedFlightId] = useState<string>();
  const [flightTypeFilter, setFlightTypeFilter] = useState<FlightTypeFilter>("all");
  const filteredFlights = useMemo(
    () => flights.filter((flight) => flightTypeFilter === "all" || flight.flightType === flightTypeFilter),
    [flightTypeFilter, flights],
  );

  useEffect(() => {
    setSelectedFlightId((currentFlightId) =>
      currentFlightId && filteredFlights.some((flight) => flight.id === currentFlightId) ? currentFlightId : undefined,
    );
  }, [filteredFlights]);

  const selectedFlight = filteredFlights.find((flight) => flight.id === selectedFlightId);
  const summary = useMemo(() => getFlightSummary(filteredFlights), [filteredFlights]);
  const airlineLegend = useMemo(() => getLegendItems(filteredFlights, "airline"), [filteredFlights]);
  const gsaLegend = useMemo(() => getLegendItems(filteredFlights, "gsa"), [filteredFlights]);
  const filterOptions = useMemo(() => getFlightFilterOptions(flights), [flights]);
  const landedFlightCount = landedAirportClusters.reduce((sum, cluster) => sum + cluster.flights.length, 0);

  return (
    <Card className="isolate overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric icon={Plane} label="Live flights" value={String(summary.totalFlights)} />
            <SummaryMetric icon={BarChart3} label="Freighters" value={String(summary.freighterFlights)} />
            <SummaryMetric icon={PlaneLanding} label="Belly cargo" value={String(summary.bellyFlights)} />
            <SummaryMetric icon={Route} label="Routes resolved" value={String(summary.routedFlights)} />
          </div>
        </div>
        {(enableFlightTypeFilter || landedAirportClusters.length > 0) && (
          <div className="flex flex-col gap-3 border-t border-border-ui pt-4 sm:flex-row sm:items-center sm:justify-between">
            {enableFlightTypeFilter && (
              <div className="inline-flex w-fit rounded-md border border-border-ui bg-surface2 p-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFlightTypeFilter(option.value)}
                    className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                      flightTypeFilter === option.value
                        ? "bg-brand text-white shadow-sm"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {landedAirportClusters.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <PlaneLanding className="h-4 w-4 text-brand" />
                <span>
                  {landedFlightCount} landed at {landedAirportClusters.length} airports in the last 24h
                </span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="relative overflow-hidden rounded-md border border-border-ui bg-surface2 min-h-[560px]">
          {filteredFlights.length > 0 || landedAirportClusters.length > 0 ? (
            <FlightLeafletMap
              flights={filteredFlights}
              markerColorMode={markerColorMode}
              selectedFlightId={selectedFlightId}
              landedAirportClusters={landedAirportClusters}
              onFlightSelect={(flightId) =>
                setSelectedFlightId((currentFlightId) => (currentFlightId === flightId ? undefined : flightId))
              }
            />
          ) : (
            <div className="flex h-full min-h-[560px] items-center justify-center text-sm text-ink-muted">
              No flights match this dashboard context.
            </div>
          )}

          {selectedFlight && (
            <aside className="absolute right-3 top-3 bottom-3 z-[1000] w-[300px] overflow-y-auto rounded-lg border border-border-ui bg-surface/95 p-4 shadow-xl backdrop-blur-sm">
              <button
                onClick={() => setSelectedFlightId(undefined)}
                className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:bg-black/10 hover:text-ink"
                aria-label="Close"
              >
                ×
              </button>
              <FlightDetails flight={selectedFlight} markerColorMode={markerColorMode} />
              <Legend title="Airlines" items={airlineLegend} />
              <Legend title="GSAs" items={gsaLegend} />
            </aside>
          )}
        </div>
      </CardContent>
    </Card>
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
          <div className="mt-1 flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-xs text-ink-muted">
              <CountryFlag code={flight.origin.countryCode} />
              <span className="font-medium text-ink">{flight.origin.airportCode}</span>
              {flight.origin.airportName}
            </span>
            <span className="pl-0.5 text-[10px] text-ink-muted/50">↓</span>
            <span className="flex items-center gap-1.5 text-xs text-ink-muted">
              <CountryFlag code={flight.destination.countryCode} />
              <span className="font-medium text-ink">{flight.destination.airportCode}</span>
              {flight.destination.airportName}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Detail label="Airline" value={flight.airlineName} />
        <Detail label="GSA" value={flight.gsaName} />
        <Detail label="Aircraft" value={flight.aircraftType ?? "Unknown"} />
        <Detail label="Registration" value={flight.registration ?? "Unknown"} />
        <Detail label="Altitude" value={flight.altitude ? `${flight.altitude.toLocaleString("en-GB")} ft` : "Unknown"} />
        <Detail label="Ground speed" value={flight.gspeed ? `${flight.gspeed.toLocaleString("en-GB")} kt` : "Unknown"} />
      </div>

      {products.length > 0 && (
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
      )}

      {flight.cargoDestinations.length > 0 && (
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Cargo destinations</p>
        <div className="mt-3 space-y-2">
          {flight.cargoDestinations.map((dest) => (
            <CargoDestinationRow key={`${dest.city}-${dest.countryCode}`} dest={dest} color={markerColor} />
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
      <p className="mt-0.5 font-medium text-ink">{value}</p>
    </div>
  );
}

function CountryFlag({ code }: { code: string }) {
  if (code === "XX") {
    return (
      <span className="inline-flex h-3 w-4 items-center justify-center rounded-[2px] bg-surface3 text-[8px] font-semibold text-ink-muted">
        --
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/20x15/${code.toLowerCase()}.png`}
      width={16}
      height={12}
      alt={code}
      className="inline-block rounded-[2px] object-cover shadow-sm"
    />
  );
}

function CargoDestinationRow({ dest, color }: { dest: CargoDestination; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-ink-muted">
          <CountryFlag code={dest.countryCode} />
          {dest.city}
        </span>
        <span className="font-semibold text-ink">{dest.percentage}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full opacity-70" style={{ width: `${dest.percentage}%`, backgroundColor: color }} />
      </div>
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
  const freighterFlights = flights.filter((flight) => flight.flightType === "freighter").length;
  const bellyFlights = flights.filter((flight) => flight.flightType === "belly").length;
  const routedFlights = flights.filter((flight) => flight.origin.countryCode !== "XX" && flight.destination.countryCode !== "XX").length;

  return { totalFlights, freighterFlights, bellyFlights, routedFlights };
}

function getFlightFilterOptions(flights: FlightTrackerRecord[]) {
  const belly = flights.filter((flight) => flight.flightType === "belly").length;
  const freighter = flights.filter((flight) => flight.flightType === "freighter").length;

  return [
    { value: "all" as const, label: `All (${flights.length})` },
    { value: "belly" as const, label: `PAX cargo (${belly})` },
    { value: "freighter" as const, label: `Cargo only (${freighter})` },
  ];
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
