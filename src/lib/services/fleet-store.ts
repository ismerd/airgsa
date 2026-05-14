import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseAdminClient } from "@/lib/supabase/client";

const STORE_PATH = path.join(process.cwd(), "data", "airline-fleet-aircraft.json");

export type FleetStatus = "in_air" | "parked" | "tracking";

export type StoredFleetAircraft = {
  registration: string;
  airline_icao: string;
  airline_name: string;
  aircraft_type?: string;
  aircraft_model?: string;
  status: FleetStatus;
  current_fr24_id?: string;
  current_flight_number?: string;
  current_callsign?: string;
  origin_iata?: string;
  origin_icao?: string;
  destination_iata?: string;
  destination_icao?: string;
  parked_airport_iata?: string;
  parked_airport_icao?: string;
  parked_airport_name?: string;
  last_position_lat?: number;
  last_position_lng?: number;
  last_altitude?: number;
  last_ground_speed?: number;
  last_seen_live_at?: string;
  first_seen_at?: string;
  raw_payload: Record<string, unknown>;
  updated_at: string;
};

export type FleetAircraftSighting = Omit<StoredFleetAircraft, "status" | "first_seen_at" | "updated_at"> & {
  status?: FleetStatus;
};

const AIRCRAFT_TYPE_LABELS: Record<string, string> = {
  B77F: "Boeing 777F",
  B748: "Boeing 747-8",
  B74F: "Boeing 747-400F",
  B744: "Boeing 747-400",
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
  A33F: "Airbus A330F",
  A332F: "Airbus A330F",
};

export function aircraftModelLabel(type: string | null | undefined) {
  if (!type) return undefined;
  return AIRCRAFT_TYPE_LABELS[type] ?? type;
}

export function isFreighterAircraft(...designations: Array<string | null | undefined>) {
  return designations.some((designation) => {
    if (!designation) return false;

    const text = designation.toUpperCase();
    if (/(P2F|BCF|BDSF|FREIGHTER)/.test(text)) return true;
    if (/\(\s*F\s*\)/.test(text)) return true;
    if (/-\s*F[A-Z0-9]*\b/.test(text)) return true;

    const compact = text.replace(/[^A-Z0-9]/g, "");
    return /\d{2,4}[A-Z]*F[A-Z0-9]*$/.test(compact);
  });
}

export async function syncFleetSightings(sightings: FleetAircraftSighting[]) {
  const normalized = sightings
    .filter((sighting) => Boolean(sighting.registration?.trim()))
    .map((sighting) => normalizeSighting(sighting));

  if (canUseSupabaseAdmin()) {
    try {
      await syncFleetSightingsToSupabase(normalized);
      return;
    } catch (err) {
      console.warn("[fleet] Supabase persistence unavailable, using file store:", (err as Error).message);
    }
  }

  await syncFleetSightingsToFile(normalized);
}

export async function getStoredFleetAircraft(airlineIcao = "SVA"): Promise<StoredFleetAircraft[]> {
  if (canUseSupabaseAdmin()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("airline_fleet_aircraft")
      .select("*")
      .eq("airline_icao", airlineIcao)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      return (data as StoredFleetAircraft[]).map(normalizeStoredAircraft);
    }
  }

  const records = await readFileStore();
  return records
    .filter((record) => record.airline_icao === airlineIcao)
    .map(normalizeStoredAircraft)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function normalizeStoredAircraft(aircraft: StoredFleetAircraft): StoredFleetAircraft {
  return {
    ...aircraft,
    aircraft_model: aircraft.aircraft_type ? aircraftModelLabel(aircraft.aircraft_type) : aircraft.aircraft_model,
  };
}

function normalizeSighting(sighting: FleetAircraftSighting): StoredFleetAircraft {
  const now = new Date().toISOString();

  return {
    ...sighting,
    registration: sighting.registration.trim().toUpperCase(),
    airline_icao: sighting.airline_icao.trim().toUpperCase(),
    aircraft_model: sighting.aircraft_model ?? aircraftModelLabel(sighting.aircraft_type),
    status: sighting.status ?? "in_air",
    first_seen_at: now,
    last_seen_live_at: sighting.last_seen_live_at ?? now,
    updated_at: now,
  };
}

async function syncFleetSightingsToSupabase(sightings: StoredFleetAircraft[]) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const liveRegistrations = new Set(sightings.map((sighting) => sighting.registration));

  if (sightings.length > 0) {
    const { error } = await supabase.from("airline_fleet_aircraft").upsert(
      sightings.map((sighting) => ({
        ...sighting,
        status: "in_air",
        updated_at: now,
      })),
      { onConflict: "registration" },
    );
    if (error) throw new Error(`fleet upsert failed: ${error.message}`);
  }

  const { data: activeAircraft, error: readError } = await supabase
    .from("airline_fleet_aircraft")
    .select("*")
    .eq("airline_icao", "SVA")
    .eq("status", "in_air");

  if (readError) throw new Error(`fleet read failed: ${readError.message}`);

  const endedAircraft = ((activeAircraft ?? []) as StoredFleetAircraft[]).filter(
    (aircraft) => !liveRegistrations.has(aircraft.registration),
  );

  await Promise.all(
    endedAircraft.map((aircraft) =>
      supabase
        .from("airline_fleet_aircraft")
        .update(buildParkedPatch(aircraft, now))
        .eq("registration", aircraft.registration),
    ),
  );
}

async function syncFleetSightingsToFile(sightings: StoredFleetAircraft[]) {
  const now = new Date().toISOString();
  const existing = await readFileStore();
  const byRegistration = new Map(existing.map((aircraft) => [aircraft.registration, aircraft]));
  const liveRegistrations = new Set(sightings.map((sighting) => sighting.registration));

  for (const sighting of sightings) {
    const previous = byRegistration.get(sighting.registration);
    byRegistration.set(sighting.registration, {
      ...previous,
      ...sighting,
      status: "in_air",
      first_seen_at: previous?.first_seen_at ?? now,
      updated_at: now,
    });
  }

  for (const aircraft of byRegistration.values()) {
    if (aircraft.airline_icao === "SVA" && aircraft.status === "in_air" && !liveRegistrations.has(aircraft.registration)) {
      byRegistration.set(aircraft.registration, {
        ...aircraft,
        ...buildParkedPatch(aircraft, now),
      });
    }
  }

  await writeFileStore(Array.from(byRegistration.values()));
}

function buildParkedPatch(aircraft: StoredFleetAircraft, now: string) {
  return {
    status: "parked" as const,
    parked_airport_iata: aircraft.destination_iata ?? aircraft.parked_airport_iata,
    parked_airport_icao: aircraft.destination_icao ?? aircraft.parked_airport_icao,
    parked_airport_name: aircraft.parked_airport_name ?? aircraft.destination_iata ?? aircraft.destination_icao,
    updated_at: now,
  };
}

async function readFileStore(): Promise<StoredFleetAircraft[]> {
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as StoredFleetAircraft[];
  } catch {
    return [];
  }
}

async function writeFileStore(records: StoredFleetAircraft[]) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
}

function canUseSupabaseAdmin() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
