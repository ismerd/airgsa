import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";
import { rowData, withPostgres } from "@/lib/services/postgres-store";
import { createSupabaseAdminClient } from "@/lib/supabase/client";

const STORE_PATH = path.join(process.cwd(), "data", "airline-fleet-aircraft.json");
const FILE_STORE_LIVE_WRITE_INTERVAL_MS = 60_000;

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

  const savedToPostgres = await withPostgres(async (client) => {
    await syncFleetSightingsToPostgres(client, normalized);
    return true;
  });
  if (savedToPostgres) return;

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
  const dbRecords = await withPostgres(async (client) => {
    const result = await client.query(
      "select data from airline_fleet_aircraft where airline_icao = $1 order by updated_at desc",
      [airlineIcao],
    );
    const records = result.rows.map((row) => normalizeStoredAircraft(rowData<StoredFleetAircraft>(row)));

    if (records.length > 0) return records;

    const fileRecords = await readFileStore();
    const matchingFileRecords = fileRecords.filter((record) => record.airline_icao === airlineIcao);
    if (matchingFileRecords.length > 0) {
      await writeFleetRecordsToPostgres(client, fileRecords);
      return matchingFileRecords.map(normalizeStoredAircraft).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }

    return records;
  });
  if (dbRecords) return dbRecords;

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

async function syncFleetSightingsToPostgres(client: Pool, sightings: StoredFleetAircraft[]) {
  const now = new Date().toISOString();
  const existing = await readFleetRecordsFromPostgres(client);
  const byRegistration = new Map(existing.map((aircraft) => [aircraft.registration, aircraft]));
  const liveRegistrations = new Set(sightings.map((sighting) => sighting.registration));

  for (const sighting of sightings) {
    const previous = byRegistration.get(sighting.registration);
    byRegistration.set(sighting.registration, mergeLiveSighting(previous, sighting, now));
  }

  for (const aircraft of byRegistration.values()) {
    if (aircraft.airline_icao === "SVA" && aircraft.status === "in_air" && !liveRegistrations.has(aircraft.registration)) {
      byRegistration.set(aircraft.registration, {
        ...aircraft,
        ...buildParkedPatch(aircraft, now),
      });
    }
  }

  const nextRecords = Array.from(byRegistration.values());
  if (JSON.stringify(existing) !== JSON.stringify(nextRecords)) {
    await writeFleetRecordsToPostgres(client, nextRecords);
  }
}

async function readFleetRecordsFromPostgres(client: Pool): Promise<StoredFleetAircraft[]> {
  const result = await client.query("select data from airline_fleet_aircraft where airline_icao = $1 order by updated_at desc", ["SVA"]);
  return result.rows.map((row) => normalizeStoredAircraft(rowData<StoredFleetAircraft>(row)));
}

async function writeFleetRecordsToPostgres(client: Pool, records: StoredFleetAircraft[]) {
  const connection = await client.connect();
  try {
    await connection.query("begin");
    await connection.query("delete from airline_fleet_aircraft where airline_icao = $1", ["SVA"]);

    for (const aircraft of records.filter((record) => record.airline_icao === "SVA")) {
      await connection.query(
        `
          insert into airline_fleet_aircraft (registration, airline_icao, status, updated_at, data)
          values ($1, $2, $3, $4, $5::jsonb)
        `,
        [aircraft.registration, aircraft.airline_icao, aircraft.status, aircraft.updated_at, JSON.stringify(aircraft)],
      );
    }

    await connection.query("commit");
  } catch (err) {
    await connection.query("rollback");
    throw err;
  } finally {
    connection.release();
  }
}

async function syncFleetSightingsToFile(sightings: StoredFleetAircraft[]) {
  const now = new Date().toISOString();
  const existing = await readFileStore();
  const byRegistration = new Map(existing.map((aircraft) => [aircraft.registration, aircraft]));
  const liveRegistrations = new Set(sightings.map((sighting) => sighting.registration));

  for (const sighting of sightings) {
    const previous = byRegistration.get(sighting.registration);
    byRegistration.set(sighting.registration, mergeLiveSighting(previous, sighting, now));
  }

  for (const aircraft of byRegistration.values()) {
    if (aircraft.airline_icao === "SVA" && aircraft.status === "in_air" && !liveRegistrations.has(aircraft.registration)) {
      byRegistration.set(aircraft.registration, {
        ...aircraft,
        ...buildParkedPatch(aircraft, now),
      });
    }
  }

  const nextRecords = Array.from(byRegistration.values());
  if (JSON.stringify(existing) !== JSON.stringify(nextRecords)) {
    await writeFileStore(nextRecords);
  }
}

function mergeLiveSighting(
  previous: StoredFleetAircraft | undefined,
  sighting: StoredFleetAircraft,
  now: string,
): StoredFleetAircraft {
  if (previous && shouldThrottleLiveFileUpdate(previous, sighting, now)) {
    return previous;
  }

  if (previous && isSameLiveSighting(previous, sighting)) {
    return previous;
  }

  return {
    ...previous,
    ...sighting,
    status: "in_air",
    first_seen_at: previous?.first_seen_at ?? now,
    updated_at: now,
  };
}

function shouldThrottleLiveFileUpdate(previous: StoredFleetAircraft, sighting: StoredFleetAircraft, now: string) {
  if (previous.status !== "in_air") return false;
  if (previous.current_fr24_id !== sighting.current_fr24_id) return false;

  const previousWrite = Date.parse(previous.updated_at);
  const currentWrite = Date.parse(now);
  if (!Number.isFinite(previousWrite) || !Number.isFinite(currentWrite)) return false;

  return currentWrite - previousWrite < FILE_STORE_LIVE_WRITE_INTERVAL_MS;
}

function isSameLiveSighting(previous: StoredFleetAircraft, sighting: StoredFleetAircraft) {
  return (
    previous.status === "in_air" &&
    previous.current_fr24_id === sighting.current_fr24_id &&
    previous.current_flight_number === sighting.current_flight_number &&
    previous.current_callsign === sighting.current_callsign &&
    previous.aircraft_type === sighting.aircraft_type &&
    previous.aircraft_model === sighting.aircraft_model &&
    previous.origin_iata === sighting.origin_iata &&
    previous.origin_icao === sighting.origin_icao &&
    previous.destination_iata === sighting.destination_iata &&
    previous.destination_icao === sighting.destination_icao &&
    previous.last_position_lat === sighting.last_position_lat &&
    previous.last_position_lng === sighting.last_position_lng &&
    previous.last_altitude === sighting.last_altitude &&
    previous.last_ground_speed === sighting.last_ground_speed &&
    previous.last_seen_live_at === sighting.last_seen_live_at
  );
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
