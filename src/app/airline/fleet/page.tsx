import { MapPin, Plane, PlaneTakeoff, Wrench } from "lucide-react";
import { FleetAircraftList, type FleetAircraftListItem } from "@/components/dashboard/fleet-aircraft-list";
import { FlightWorldMap } from "@/components/dashboard/flight-world-map";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { getSaudiaFlights } from "@/lib/services/fr24";
import { getStoredFleetAircraft, isFreighterAircraft, type StoredFleetAircraft } from "@/lib/services/fleet-store";

export const dynamic = "force-dynamic";
const ENABLE_FLEET_MAP = false;

export default async function FleetPage() {
  await getSaudiaFlights();
  const fleet = await getStoredFleetAircraft();

  const freighters = fleet.filter(isStoredFreighterAircraft);
  const belly = fleet.filter((aircraft) => !isStoredFreighterAircraft(aircraft));
  const inAir = fleet.filter((aircraft) => aircraft.status === "in_air");
  const parked = fleet.filter((aircraft) => aircraft.status === "parked");
  const listItems = fleet.map(toFleetListItem);

  return (
    <>
      <Topbar title="Fleet overview" subtitle="Saudia Cargo" />
      <main className="space-y-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Dedicated freighters", value: String(freighters.length), sub: "Explicit F/P2F freighter markings", icon: PlaneTakeoff },
            { label: "Belly cargo", value: String(belly.length), sub: "Passenger aircraft with cargo", icon: Plane },
            { label: "In air now", value: String(inAir.length), sub: "Seen in latest worldmap sync", icon: Wrench },
            { label: "Parked", value: String(parked.length), sub: "Last known at destination", icon: MapPin },
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
            flights={[]}
            markerColorMode="airline"
            enableFlightTypeFilter
          />
        )}

        <FleetAircraftList aircraft={listItems} />
      </main>
    </>
  );
}

function toFleetListItem(aircraft: StoredFleetAircraft): FleetAircraftListItem {
  return {
    registration: aircraft.registration,
    aircraft_type: aircraft.aircraft_type,
    aircraft_model: getStoredAircraftModelLabel(aircraft),
    cargo_role: isStoredFreighterAircraft(aircraft) ? "freighter" : "mixed",
    status: aircraft.status,
    current_fr24_id: aircraft.current_fr24_id,
    current_flight_number: aircraft.current_flight_number,
    current_callsign: aircraft.current_callsign,
    origin_iata: aircraft.origin_iata,
    origin_icao: aircraft.origin_icao,
    destination_iata: aircraft.destination_iata,
    destination_icao: aircraft.destination_icao,
    parked_airport_iata: aircraft.parked_airport_iata,
    parked_airport_icao: aircraft.parked_airport_icao,
    last_altitude: aircraft.last_altitude,
    last_ground_speed: aircraft.last_ground_speed,
    last_seen_live_at: aircraft.last_seen_live_at,
    updated_at: aircraft.updated_at,
  };
}

function isStoredFreighterAircraft(aircraft: StoredFleetAircraft) {
  return (
    isFreighterAircraft(aircraft.aircraft_type, aircraft.aircraft_model) ||
    getRawString(aircraft, ["normalized", "flight_type"]) === "freighter" ||
    getRawString(aircraft, ["live_position", "category"]) === "C" ||
    getRawString(aircraft, ["live_position", "cargo_hint"]) === "freighter" ||
    isLegacyCargoPrioritySighting(aircraft)
  );
}

function getStoredAircraftModelLabel(aircraft: StoredFleetAircraft) {
  if (isStoredFreighterAircraft(aircraft) && aircraft.aircraft_type === "B77L") {
    return "Boeing 777-FFG";
  }

  return aircraft.aircraft_model;
}

function isLegacyCargoPrioritySighting(aircraft: StoredFleetAircraft) {
  return (
    getRawString(aircraft, ["live_position", "query_kind"]) === "cargo-priority" &&
    getRawNumber(aircraft, ["live_position", "query_priority"]) === 0
  );
}

function getRawString(aircraft: StoredFleetAircraft, path: string[]) {
  const value = getRawValue(aircraft, path);
  return typeof value === "string" ? value : undefined;
}

function getRawNumber(aircraft: StoredFleetAircraft, path: string[]) {
  const value = getRawValue(aircraft, path);
  return typeof value === "number" ? value : undefined;
}

function getRawValue(aircraft: StoredFleetAircraft, path: string[]) {
  let current: unknown = aircraft.raw_payload;
  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
