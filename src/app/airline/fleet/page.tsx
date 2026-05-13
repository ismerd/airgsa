import type React from "react";
import { Plane, PlaneTakeoff, Wrench } from "lucide-react";
import { FlightWorldMap } from "@/components/dashboard/flight-world-map";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSaudiaFlights } from "@/lib/services/fr24";
import type { FlightTrackerRecord } from "@/lib/dummy-flight-data";

export const dynamic = "force-dynamic";
const ENABLE_FLEET_MAP = false;

const AIRCRAFT_TYPE_LABELS: Record<string, string> = {
  B77F: "Boeing 777F",
  B748: "Boeing 747-8F",
  B74F: "Boeing 747-400F",
  B77W: "Boeing 777-300ER",
  B789: "Boeing 787-9",
  B788: "Boeing 787-8",
  A333: "Airbus A330-300",
  A332: "Airbus A330-200",
  A321: "Airbus A321",
  A320: "Airbus A320",
  A319: "Airbus A319",
  B772: "Boeing 777-200",
  B77L: "Boeing 777-200LR",
};

function typeLabel(icao: string | undefined) {
  if (!icao) return "Unknown";
  return AIRCRAFT_TYPE_LABELS[icao] ?? icao;
}

// Great-circle progress: how far along the route is the current position (0–100)
function routeProgress(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  current: { lat: number; lng: number }
): number {
  const total = haversineKm(origin, dest);
  if (total === 0) return 0;
  const flown = haversineKm(origin, current);
  return Math.min(100, Math.round((flown / total) * 100));
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export default async function FleetPage() {
  const { flights } = await getSaudiaFlights();

  const freighters = flights.filter(f => f.flightType === "freighter");
  const belly = flights.filter(f => f.flightType === "belly");
  const totalTonnage = flights.reduce((s, f) => s + f.tonnage, 0);
  const avgLf = flights.length > 0
    ? Math.round(flights.reduce((s, f) => s + f.loadFactor, 0) / flights.length)
    : 0;

  return (
    <>
      <Topbar
        title="Fleet overview"
        subtitle="Saudia Cargo"
      />
      <main className="space-y-6 p-5">

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Dedicated freighters", value: String(freighters.length), sub: "Boeing 777F · 747-8F airborne", icon: PlaneTakeoff },
            { label: "Belly cargo", value: String(belly.length), sub: "Passenger aircraft with cargo", icon: Plane },
            { label: "Total tonnage", value: flights.length > 0 ? `${totalTonnage.toFixed(1)} t` : "—", sub: "Estimated payload in transit", icon: Wrench },
            { label: "Avg load factor", value: flights.length > 0 ? `${avgLf}%` : "—", sub: "Across all active flights", icon: Plane },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-ink">{item.value}</p>
                  </div>
                  <div className="rounded-md bg-brand-light p-2 text-brand">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-ink-muted">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Fleet map is intentionally disabled for now. Keep this block so it can be re-enabled later. */}
        {ENABLE_FLEET_MAP && (
          <FlightWorldMap
            title="Live fleet positions"
            subtitle="All active Saudia aircraft currently visible on the worldmap."
            flights={flights}
            markerColorMode="airline"
            enableFlightTypeFilter
          />
        )}

        <FleetTable
          title="Worldmap tracked fleet"
          icon={<Plane className="h-5 w-5 text-brand" />}
          flights={flights}
          emptyLabel="No Saudia aircraft currently visible on the worldmap"
          emptyNote="Aircraft will be added here as soon as they appear in the live worldmap feed"
        />

        {/* Dedicated freighters table */}
        <FleetTable
          title="Dedicated freighters"
          icon={<PlaneTakeoff className="h-5 w-5 text-brand" />}
          flights={freighters}
          emptyLabel="No dedicated freighters (B777F · B747-8F) currently airborne"
          emptyNote="Freighters typically depart 20:00–02:00 Jeddah time (UTC+3)"
        />

        {/* Belly cargo table */}
        <FleetTable
          title="Belly cargo"
          icon={<Plane className="h-5 w-5 text-cyan-500" />}
          flights={belly}
          emptyLabel="No belly cargo flights currently tracked"
          emptyNote="Belly capacity on B777-368ER, A330-300, B787-9, A321, A320"
        />

        {flights.length === 0 && (
          <EmptyState />
        )}

      </main>
    </>
  );
}

function FleetTable({
  title, icon, flights, emptyLabel, emptyNote,
}: {
  title: string;
  icon: React.ReactNode;
  flights: FlightTrackerRecord[];
  emptyLabel: string;
  emptyNote: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
          <span className="ml-auto text-sm font-normal text-ink-muted">{flights.length} active</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {flights.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm font-medium text-ink-muted">{emptyLabel}</p>
            <p className="text-xs text-ink-muted/60">{emptyNote}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-ui text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <th className="pb-3 text-left">Aircraft</th>
                <th className="pb-3 text-left">Status</th>
                <th className="pb-3 text-left">Flight</th>
                <th className="pb-3 text-left min-w-[220px]">Route progress</th>
                <th className="pb-3 text-left">Altitude / Speed</th>
                <th className="pb-3 text-left">Load factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-ui">
              {flights.map((flight) => (
                <FleetRow key={flight.id} flight={flight} />
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function FleetRow({ flight }: { flight: FlightTrackerRecord }) {
  const progress = routeProgress(flight.origin, flight.destination, flight.currentPosition);
  const sameAirport = flight.origin.airportCode === flight.destination.airportCode;
  const status = getFlightStatus(flight);

  return (
    <tr className="align-top text-ink-muted">
      {/* Aircraft */}
      <td className="py-4">
        <p className="font-mono font-semibold text-ink">{flight.registration ?? "—"}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{typeLabel(flight.aircraftType)}</p>
      </td>

      {/* Status */}
      <td className="py-4">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${status.dotClass}`} />
          <Badge variant="default">{status.label}</Badge>
        </span>
        <p className="mt-1 text-[11px] text-ink-muted">{status.detail}</p>
      </td>

      {/* Flight */}
      <td className="py-4">
        <p className="font-semibold text-ink">{flight.flightNumber}</p>
        <p className="text-xs text-ink-muted">{flight.tonnage.toFixed(1)} t est.</p>
      </td>

      {/* Route progress */}
      <td className="py-4 pr-6">
        {sameAirport ? (
          <p className="text-xs text-ink-muted">Route resolving…</p>
        ) : (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-mono text-ink-muted">{flight.origin.airportCode}</span>
              <span className="text-brand">{progress}%</span>
              <span className="font-mono text-ink-muted">{flight.destination.airportCode}</span>
            </div>
            <div className="relative h-1.5 w-full overflow-visible rounded-full bg-black/10">
              <div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${progress}%` }} />
              <span
                className="absolute -top-[7px] -translate-x-1/2 text-brand"
                style={{ left: `${progress}%` }}
              >✈</span>
            </div>
          </div>
        )}
      </td>

      {/* Altitude / Speed */}
      <td className="py-4">
        <div className="space-y-0.5 text-xs">
          {flight.altitude != null ? (
            <p className="text-ink">
              {Math.round(flight.altitude / 100) * 100} ft
            </p>
          ) : (
            <p className="text-ink-muted">— ft</p>
          )}
          {flight.gspeed != null ? (
            <p className="text-ink-muted">{flight.gspeed} kts</p>
          ) : (
            <p className="text-ink-muted">— kts</p>
          )}
        </div>
      </td>

      {/* Load factor */}
      <td className="py-4">
        <p className={`font-semibold ${flight.loadFactor >= 80 ? "text-emerald-400" : flight.loadFactor >= 65 ? "text-amber-400" : "text-rose-400"}`}>
          {flight.loadFactor}%
        </p>
        <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-black/10">
          <div
            className={`h-full rounded-full ${flight.loadFactor >= 80 ? "bg-emerald-400" : flight.loadFactor >= 65 ? "bg-amber-400" : "bg-rose-400"}`}
            style={{ width: `${flight.loadFactor}%` }}
          />
        </div>
      </td>
    </tr>
  );
}

function getFlightStatus(flight: FlightTrackerRecord) {
  const altitude = flight.altitude ?? 0;
  const speed = flight.gspeed ?? 0;

  if (flight.altitude == null && flight.gspeed == null) {
    return {
      label: "Tracking",
      detail: "Live position received",
      dotClass: "bg-ink-muted",
    };
  }

  if (altitude <= 500 && speed < 80) {
    return {
      label: "On ground",
      detail: speed > 0 ? `${speed} kts ground speed` : "Airport surface",
      dotClass: "bg-amber-400",
    };
  }

  if (altitude < 10000) {
    return {
      label: "Low altitude",
      detail: `${Math.round(altitude / 100) * 100} ft`,
      dotClass: "bg-cyan-500 animate-pulse",
    };
  }

  return {
    label: "Airborne",
    detail: `${Math.round(altitude / 100) * 100} ft${speed ? ` · ${speed} kts` : ""}`,
    dotClass: "bg-brand animate-pulse",
  };
}

function EmptyState() {
  // Show local Jeddah time (UTC+3) so it is clear whether it is a quiet cargo window.
  const jedTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const jedHour = jedTime.getUTCHours();
  const jedTimeStr = jedTime.toUTCString().slice(17, 22); // HH:MM
  const isTypicallyQuiet = jedHour >= 6 && jedHour < 20;

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Plane className="h-9 w-9 text-ink-muted/30" />
      <div>
        <p className="font-semibold text-ink">No freighters airborne right now</p>
        <p className="mt-1 text-sm text-ink-muted max-w-sm">
          Saudia Cargo dedicated freighters will appear here as soon as one departs.
        </p>
      </div>
      {isTypicallyQuiet && (
        <div className="mt-1 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400 max-w-sm">
          <span className="font-semibold">Jeddah local time: {jedTimeStr}</span>
          <span className="ml-2 text-amber-400/70">·</span>
          <span className="ml-2 text-amber-400/80">
            Cargo freighters typically depart 20:00–02:00 JED. Check back tonight.
          </span>
        </div>
      )}
    </div>
  );
}

