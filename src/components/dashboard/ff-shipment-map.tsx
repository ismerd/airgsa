"use client";

import dynamic from "next/dynamic";
import { Clock, Package, PlaneTakeoff } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FlightTrackerRecord } from "@/lib/dummy-flight-data";

const FlightLeafletMap = dynamic(
  () => import("@/components/dashboard/flight-map-leaflet").then((m) => m.FlightLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-surface2 text-sm text-ink-muted">
        Loading map…
      </div>
    ),
  },
);

export type FfShipment = {
  awb: string;
  flightId: string;
  weightKg: number;
  product: string;
  status: "booked" | "in-transit" | "delayed" | "delivered";
  eta: string;
};

type Props = {
  flights: FlightTrackerRecord[];
  shipments: FfShipment[];
};

const statusVariant: Record<FfShipment["status"], "success" | "warning" | "danger" | "default" | "muted"> = {
  "in-transit": "default",
  delivered: "success",
  delayed: "danger",
  booked: "muted",
};

export function FfShipmentMap({ flights, shipments }: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const selectedFlight = flights.find((f) => f.id === selectedId);
  const myShipments = shipments.filter((s) => s.flightId === selectedId);

  const activeCount = shipments.filter((s) => s.status === "in-transit" || s.status === "delayed").length;
  const totalKg = shipments.reduce((acc, s) => acc + s.weightKg, 0);

  const airlineColors = [...new Map(flights.map((f) => [f.airlineName, f.airlineColor])).entries()];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Live shipment tracker</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">
              Flights carrying your cargo. Click an aircraft to view your shipment status.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric icon={PlaneTakeoff} label="Flights tracked" value={String(flights.length)} />
            <Metric icon={Package} label="My shipments" value={String(shipments.length)} />
            <Metric icon={Clock} label="Total weight" value={`${(totalKg / 1000).toFixed(1)} t`} />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid overflow-hidden rounded-md border border-border-ui bg-surface2 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="relative min-h-[420px]">
            <FlightLeafletMap
              flights={flights}
              markerColorMode="airline"
              selectedFlightId={selectedId}
              onFlightSelect={(id) => setSelectedId((cur) => (cur === id ? undefined : id))}
            />
          </div>

          <aside className="border-t border-border-ui bg-surface p-4 xl:border-l xl:border-t-0">
            {selectedFlight ? (
              <FlightPane flight={selectedFlight} shipments={myShipments} />
            ) : (
              <div className="mb-5 rounded-md border border-dashed border-border-ui bg-surface p-4">
                <p className="text-sm font-semibold text-ink">No flight selected</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Click an aircraft on the map to see your shipment details on that flight.
                </p>
              </div>
            )}

            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Airlines</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {airlineColors.map(([name, color]) => (
                  <div key={name} className="flex items-center gap-2 rounded-full border border-border-ui px-2.5 py-1">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-ink-muted">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function FlightPane({ flight, shipments }: { flight: FlightTrackerRecord; shipments: FfShipment[] }) {
  return (
    <div className="mb-5 rounded-md border border-border-ui bg-surface p-4">
      {/* Flight identity only — no commercial data */}
      <div className="flex items-start gap-2">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: flight.airlineColor }} />
        <div>
          <p className="text-sm font-semibold text-ink">{flight.flightNumber}</p>
          <p className="text-xs text-ink-muted">
            {flight.origin.airportCode} — {flight.origin.airportName}
          </p>
          <p className="text-xs text-ink-muted">
            {flight.destination.airportCode} — {flight.destination.airportName}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-ink-muted">Airline</p>
          <p className="mt-0.5 font-medium text-ink">{flight.airlineName}</p>
        </div>
        <div>
          <p className="text-ink-muted">Status</p>
          <p className="mt-0.5 font-medium text-brand">En route</p>
        </div>
      </div>

      {/* My shipments on this flight */}
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Your shipments on this flight
        </p>
        {shipments.length > 0 ? (
          <div className="mt-2 space-y-2">
            {shipments.map((s) => (
              <div key={s.awb} className="rounded-md border border-border-ui bg-surface2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-brand">{s.awb}</span>
                  <Badge variant={statusVariant[s.status]}>{s.status}</Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-ink-muted">Weight</p>
                    <p className="mt-0.5 text-ink">{s.weightKg.toLocaleString()} kg</p>
                  </div>
                  <div>
                    <p className="text-ink-muted">Product</p>
                    <p className="mt-0.5 text-ink">{s.product}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-ink-muted">ETA</p>
                    <p className="mt-0.5 text-ink">{s.eta}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-md border border-dashed border-border-ui p-3 text-center text-xs text-ink-muted">
            No shipments from your account on this flight.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof PlaneTakeoff; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-ui bg-surface2 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Icon className="h-3.5 w-3.5 text-brand" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
