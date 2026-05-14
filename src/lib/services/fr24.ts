/**
 * Flightradar24 API v1 client - server-side only.
 *
 * The FR24 API spec in this repo does not expose a complete airline fleet roster
 * endpoint. We can query live aircraft by airline livery/operator and query
 * historical flight summaries over a date range to infer seen registrations and
 * airport arrivals.
 */

import { unstable_cache } from "next/cache";
import type { AirportPoint, FlightTrackerRecord, LandedAirportCluster } from "@/lib/dummy-flight-data";
import { AIRPORTS, ICAO_TO_IATA, SAUDIA_CARGO, SAUDIA_GSA_PARTNERS } from "@/lib/saudia-cargo-data";
import {
  generateCargoDestinations,
  generateProductMix,
  generateSyntheticRevenue,
} from "@/lib/services/synthetic-revenue";
import { getFr24Settings } from "@/lib/services/fr24-settings";
import {
  aircraftModelLabel,
  getStoredFleetAircraft,
  isFreighterAircraft,
  syncFleetSightings,
  type FleetAircraftSighting,
} from "@/lib/services/fleet-store";

const FR24_BASE = "https://fr24api.flightradar24.com";
const API_KEY = process.env.FLIGHTRADAR24_API_KEY;
const SAUDIA_ICAO = SAUDIA_CARGO.icao;
const FR24_TIMEOUT_MS = 10_000;
const FR24_LIVE_REQUEST_BUDGET = 10;
const PASSENGER_ALTITUDE_BUCKETS = [
  "0-19999",
  "20000-33999",
  "34000-36999",
  "37000-39999",
  "40000-60000",
];
const FREIGHTER_AIRCRAFT_TYPES = ["B77F", "A33F", "A332F", "B74F"];

type Fr24FlightCategory = "P" | "C" | "M" | "J" | "T" | "H" | "B" | "G" | "D" | "V" | "O" | "N";

type Fr24LivePosition = {
  fr24_id: string;
  flight?: string | null;
  callsign?: string | null;
  lat: number;
  lon: number;
  track?: number | null;
  alt?: number | null;
  gspeed?: number | null;
  type?: string | null;
  reg?: string | null;
  painted_as?: string | null;
  operating_as?: string | null;
  orig_iata?: string | null;
  orig_icao?: string | null;
  dest_iata?: string | null;
  dest_icao?: string | null;
  dest_iata_actual?: string | null;
  dest_icao_actual?: string | null;
  category?: Fr24FlightCategory | null;
  query_priority?: number;
  query_kind?: "cargo-priority" | "passenger";
  cargo_hint?: "freighter";
};

type Fr24LiveResponse = { data?: Fr24LivePosition[] };
type Fr24LiveFetchResult = { data: Fr24LivePosition[]; fetchedAt: string };

type LivePositionQuery = {
  filter?: "painted_as" | "operating_as";
  categories?: string;
  altitudeRange?: string;
  aircraftTypes?: string[];
  registrations?: string[];
  kind: "cargo-priority" | "passenger";
  cargoHint?: "freighter";
};

type Fr24SummaryRecord = {
  fr24_id: string;
  flight?: string | null;
  callsign?: string | null;
  reg?: string | null;
  type?: string | null;
  painted_as?: string | null;
  operating_as?: string | null;
  orig_iata?: string | null;
  orig_icao?: string | null;
  dest_iata?: string | null;
  dest_icao?: string | null;
  dest_iata_actual?: string | null;
  dest_icao_actual?: string | null;
  datetime_landed?: string | null;
  first_seen?: string | null;
  last_seen?: string | null;
  flight_ended?: boolean | null;
};

type Fr24SummaryResponse = { data?: Fr24SummaryRecord[] };

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Accept-Version": "v1",
    Accept: "application/json",
  };
}

async function fetchLivePositionSet(query: LivePositionQuery, priority: number): Promise<Fr24LivePosition[]> {
  const params = new URLSearchParams({
    limit: "500",
  });
  if (query.filter) params.set(query.filter, SAUDIA_ICAO);
  if (query.categories) params.set("categories", query.categories);
  if (query.altitudeRange) params.set("altitude_ranges", query.altitudeRange);
  if (query.aircraftTypes?.length) params.set("aircraft", query.aircraftTypes.join(","));
  if (query.registrations?.length) params.set("registrations", query.registrations.join(","));

  const res = await fetch(`${FR24_BASE}/api/live/flight-positions/full?${params.toString()}`, {
    headers: headers(),
    cache: "no-store",
    signal: AbortSignal.timeout(FR24_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`live-positions ${params.toString()} HTTP ${res.status}`);
  const json = (await res.json()) as Fr24LiveResponse;
  const fallbackCategory = query.categories?.includes(",")
    ? undefined
    : (query.categories as Fr24FlightCategory | undefined);
  return (json.data ?? []).map((position) => ({
    ...position,
    category: position.category ?? fallbackCategory,
    query_priority: priority,
    query_kind: query.kind,
    cargo_hint: query.cargoHint,
  }));
}

const fetchLivePositions = unstable_cache(
  async (): Promise<Fr24LiveFetchResult> => {
    const fetchedAt = new Date().toISOString();
    // Explorer plan has a 20-row response limit and a 10-request rate limit.
    // Run cargo-priority queries first so rate/row limits push out PAX traffic before freighters.
    const knownFreighterRegistrations = await getKnownFreighterRegistrations();
    const cargoPriorityQueries: LivePositionQuery[] = [
      { filter: "operating_as", categories: "C", kind: "cargo-priority", cargoHint: "freighter" },
      { filter: "painted_as", categories: "C", kind: "cargo-priority", cargoHint: "freighter" },
      { filter: "operating_as", aircraftTypes: FREIGHTER_AIRCRAFT_TYPES, kind: "cargo-priority", cargoHint: "freighter" },
      { filter: "painted_as", aircraftTypes: FREIGHTER_AIRCRAFT_TYPES, kind: "cargo-priority", cargoHint: "freighter" },
      ...chunk(knownFreighterRegistrations, 15)
        .slice(0, 2)
        .map((registrations) => ({ registrations, kind: "cargo-priority" as const, cargoHint: "freighter" as const })),
    ];
    const remainingBudget = Math.max(0, FR24_LIVE_REQUEST_BUDGET - cargoPriorityQueries.length);
    const passengerQueries: LivePositionQuery[] = PASSENGER_ALTITUDE_BUCKETS.slice(0, remainingBudget).map((altitudeRange) => ({
      filter: "operating_as",
      categories: "P",
      altitudeRange,
      kind: "passenger",
    }));
    const queries = [...cargoPriorityQueries, ...passengerQueries].slice(0, FR24_LIVE_REQUEST_BUDGET);
    const positions: Fr24LivePosition[] = [];
    const errors: unknown[] = [];

    for (const [priority, query] of queries.entries()) {
      try {
        positions.push(...await fetchLivePositionSet(query, priority));
      } catch (err) {
        errors.push(err);
      }
    }

    if (positions.length === 0 && errors.length > 0) {
      throw errors[0] ?? new Error("live-positions HTTP error");
    }

    return { data: dedupeByFr24Id(positions), fetchedAt };
  },
  ["fr24-saudia-all-live-positions-v2"],
  { revalidate: 300 },
);

async function fetchFlightSummary(fr24Ids: string[]): Promise<Map<string, Fr24SummaryRecord>> {
  if (fr24Ids.length === 0) return new Map();

  const chunks = chunk(fr24Ids, 15);
  const records = await Promise.all(
    chunks.map(async (ids) => {
      const params = new URLSearchParams({
        flight_ids: ids.join(","),
        limit: "50",
      });
      const res = await fetch(`${FR24_BASE}/api/flight-summary/light?${params.toString()}`, {
        headers: headers(),
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(FR24_TIMEOUT_MS),
      });
      if (!res.ok) return [];
      const json = (await res.json()) as Fr24SummaryResponse;
      return json.data ?? [];
    }),
  );

  return new Map(records.flat().map((record) => [record.fr24_id, record]));
}

async function fetchSummarySet(filter: "painted_as" | "operating_as"): Promise<Fr24SummaryRecord[]> {
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    [filter]: SAUDIA_ICAO,
    flight_datetime_from: formatFr24Date(from),
    flight_datetime_to: formatFr24Date(now),
    sort: "desc",
    limit: "300",
  });

  const res = await fetch(`${FR24_BASE}/api/flight-summary/light?${params.toString()}`, {
    headers: headers(),
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(FR24_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`flight-summary ${filter} HTTP ${res.status}`);
  const json = (await res.json()) as Fr24SummaryResponse;
  return json.data ?? [];
}

const fetchRecentFlightSummaries = unstable_cache(
  async (): Promise<Fr24SummaryRecord[]> => {
    const results = await Promise.allSettled([fetchSummarySet("painted_as"), fetchSummarySet("operating_as")]);
    const summaries = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    if (summaries.length === 0 && results.some((result) => result.status === "rejected")) {
      const error = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
      throw error?.reason ?? new Error("flight-summary HTTP error");
    }
    return dedupeSummaries(summaries);
  },
  ["fr24-saudia-recent-flight-summaries-v1"],
  { revalidate: 600 },
);

function resolveByIcao(icao: string | null | undefined): AirportPoint | null {
  if (!icao) return null;
  const iata = ICAO_TO_IATA[icao];
  return iata ? (AIRPORTS[iata] ?? null) : null;
}

function resolveByIata(iata: string | null | undefined): AirportPoint | null {
  return iata ? (AIRPORTS[iata] ?? null) : null;
}

function resolveAirportFromSummary(record: Fr24SummaryRecord, direction: "origin" | "destination"): AirportPoint | null {
  if (direction === "origin") {
    return resolveByIcao(record.orig_icao) ?? resolveByIata(record.orig_iata);
  }

  return (
    resolveByIcao(record.dest_icao_actual) ??
    resolveByIcao(record.dest_icao) ??
    resolveByIata(record.dest_iata_actual) ??
    resolveByIata(record.dest_iata)
  );
}

function pickGsa(flightNumber: string) {
  const n = parseInt(flightNumber.replace(/\D/g, ""), 10) || 0;
  return SAUDIA_GSA_PARTNERS[n % SAUDIA_GSA_PARTNERS.length];
}

function resolveFlightType(
  icaoType: string | null | undefined,
  position?: Pick<Fr24LivePosition, "category" | "cargo_hint">,
): "freighter" | "belly" {
  if (position?.category === "C" || position?.cargo_hint === "freighter") return "freighter";
  return isFreighterAircraft(icaoType, aircraftModelLabel(icaoType)) ? "freighter" : "belly";
}

function makeFallbackAirport(
  code: string | null | undefined,
  airportName: string,
  position: { lat: number; lng: number },
): AirportPoint {
  return {
    airportCode: code ?? "TBD",
    airportName,
    countryCode: "XX",
    lat: position.lat,
    lng: position.lng,
  };
}

function buildRecord(
  pos: Fr24LivePosition,
  summary: Fr24SummaryRecord | undefined,
  index: number,
): FlightTrackerRecord | null {
  const flightNumber =
    summary?.flight ??
    pos.flight ??
    (pos.callsign ? pos.callsign.replace(/^SVA?/, "SV") : `SV${800 + index}`);

  const origin =
    resolveByIcao(summary?.orig_icao) ??
    resolveByIcao(pos.orig_icao) ??
    resolveByIata(summary?.orig_iata) ??
    resolveByIata(pos.orig_iata);
  const destination =
    resolveByIcao(summary?.dest_icao_actual) ??
    resolveByIcao(summary?.dest_icao) ??
    resolveByIcao(pos.dest_icao_actual) ??
    resolveByIcao(pos.dest_icao) ??
    resolveByIata(summary?.dest_iata_actual) ??
    resolveByIata(summary?.dest_iata) ??
    resolveByIata(pos.dest_iata_actual) ??
    resolveByIata(pos.dest_iata);

  const currentPosition = { lat: pos.lat, lng: pos.lon };
  const fallbackOrigin = makeFallbackAirport(
    summary?.orig_iata ?? pos.orig_iata ?? summary?.orig_icao ?? pos.orig_icao,
    "Origin resolving",
    currentPosition,
  );
  const fallbackDestination = makeFallbackAirport(
    summary?.dest_iata_actual ??
      summary?.dest_iata ??
      pos.dest_iata_actual ??
      pos.dest_iata ??
      summary?.dest_icao_actual ??
      summary?.dest_icao ??
      pos.dest_icao_actual ??
      pos.dest_icao,
    "Destination resolving",
    currentPosition,
  );
  const resolvedOrigin = origin ?? fallbackOrigin;
  const resolvedDestination = destination ?? fallbackDestination;

  const aircraftType = summary?.type ?? pos.type ?? undefined;
  const flightType = resolveFlightType(aircraftType, pos);
  const rev = generateSyntheticRevenue(flightNumber, resolvedOrigin.airportCode, resolvedDestination.airportCode);
  const gsa = pickGsa(flightNumber);

  return {
    id: pos.fr24_id,
    flightNumber,
    airlineName: SAUDIA_CARGO.name,
    airlineColor: SAUDIA_CARGO.color,
    gsaName: gsa.name,
    gsaColor: gsa.color,
    origin: resolvedOrigin,
    destination: resolvedDestination,
    currentPosition,
    track: pos.track ?? undefined,
    altitude: pos.alt ?? undefined,
    gspeed: pos.gspeed ?? undefined,
    registration: summary?.reg ?? pos.reg ?? undefined,
    aircraftType,
    flightType,
    tonnage: rev.tonnage,
    loadFactor: rev.loadFactor,
    revenue: rev.revenue,
    averageYield: rev.averageYield,
    products: generateProductMix(resolvedDestination.airportCode),
    soldBy: index % 3 === 0 ? "airline" : "gsa",
    salesTeam: gsa.name,
    responsibleGsa: gsa.name,
    cargoDestinations: generateCargoDestinations(resolvedDestination.airportCode, resolvedDestination.countryCode),
  };
}

function buildFleetSighting(
  pos: Fr24LivePosition,
  summary: Fr24SummaryRecord | undefined,
  observedAt: string,
): FleetAircraftSighting {
  const aircraftType = summary?.type ?? pos.type ?? undefined;
  const destinationIata = summary?.dest_iata_actual ?? summary?.dest_iata ?? pos.dest_iata_actual ?? pos.dest_iata ?? undefined;
  const destinationIcao = summary?.dest_icao_actual ?? summary?.dest_icao ?? pos.dest_icao_actual ?? pos.dest_icao ?? undefined;
  const destinationAirport =
    resolveByIata(destinationIata) ??
    resolveByIcao(destinationIcao);

  return {
    registration: summary?.reg ?? pos.reg ?? "",
    airline_icao: SAUDIA_CARGO.icao,
    airline_name: SAUDIA_CARGO.name,
    aircraft_type: aircraftType,
    aircraft_model: aircraftModelLabel(aircraftType),
    current_fr24_id: pos.fr24_id,
    current_flight_number: summary?.flight ?? pos.flight ?? undefined,
    current_callsign: summary?.callsign ?? pos.callsign ?? undefined,
    origin_iata: summary?.orig_iata ?? pos.orig_iata ?? undefined,
    origin_icao: summary?.orig_icao ?? pos.orig_icao ?? undefined,
    destination_iata: destinationIata,
    destination_icao: destinationIcao,
    parked_airport_iata: destinationAirport?.airportCode ?? destinationIata,
    parked_airport_icao: destinationIcao,
    parked_airport_name: destinationAirport?.airportName,
    last_position_lat: pos.lat,
    last_position_lng: pos.lon,
    last_altitude: pos.alt ?? undefined,
    last_ground_speed: pos.gspeed ?? undefined,
    last_seen_live_at: observedAt,
    raw_payload: {
      live_position: pos,
      flight_summary: summary ?? null,
      normalized: {
        destination_airport: destinationAirport ?? null,
        aircraft_model: aircraftModelLabel(aircraftType),
        flight_type: resolveFlightType(aircraftType, pos),
      },
    },
  };
}

export type FlightDataSource = "live" | "disabled" | "no-key" | "no-flights" | "error";
export type SaudiaFlightResult = {
  flights: FlightTrackerRecord[];
  source: FlightDataSource;
  fetchedAt: string;
};

export async function getSaudiaFlights(): Promise<SaudiaFlightResult> {
  const fallbackFetchedAt = new Date().toISOString();
  const settings = await getFr24Settings();

  if (!settings.enabled) {
    return { flights: [], source: "disabled", fetchedAt: fallbackFetchedAt };
  }

  if (!API_KEY) {
    return { flights: [], source: "no-key", fetchedAt: fallbackFetchedAt };
  }

  try {
    const liveResult = await fetchLivePositions();
    const fetchedAt = liveResult.fetchedAt;
    const positions = liveResult.data.filter((position) => (position.alt ?? 0) > 500);

    if (positions.length === 0) {
      await persistFleetSightings([]);
      return { flights: [], source: "no-flights", fetchedAt };
    }

    const summaryMap = await fetchFlightSummary(positions.map((position) => position.fr24_id));
    await persistFleetSightings(positions.map((position) => buildFleetSighting(position, summaryMap.get(position.fr24_id), fetchedAt)));
    const flights = positions
      .map((position, index) => buildRecord(position, summaryMap.get(position.fr24_id), index))
      .filter((flight): flight is FlightTrackerRecord => flight !== null);

    return { flights, source: flights.length > 0 ? "live" : "no-flights", fetchedAt };
  } catch (err) {
    console.warn("[fr24] API error:", (err as Error).message);
    return { flights: [], source: "error", fetchedAt: fallbackFetchedAt };
  }
}

async function persistFleetSightings(sightings: FleetAircraftSighting[]) {
  try {
    await syncFleetSightings(sightings);
  } catch (err) {
    console.warn("[fleet] persistence error:", (err as Error).message);
  }
}

export async function getSaudiaLandedAirportClusters(): Promise<LandedAirportCluster[]> {
  const settings = await getFr24Settings();
  if (!settings.enabled) return [];

  if (!API_KEY) return [];

  try {
    const summaries = await fetchRecentFlightSummaries();
    const clusters = new Map<string, LandedAirportCluster>();

    for (const summary of summaries) {
      if (!summary.datetime_landed) continue;

      const airport = resolveAirportFromSummary(summary, "destination");
      if (!airport) continue;

      const flightNumber =
        summary.flight ??
        (summary.callsign ? summary.callsign.replace(/^SVA?/, "SV") : `SV-${summary.fr24_id.slice(-4)}`);
      const cluster = clusters.get(airport.airportCode) ?? { airport, flights: [] };
      cluster.flights.push({
        id: summary.fr24_id,
        flightNumber,
        registration: summary.reg ?? undefined,
        aircraftType: summary.type ?? undefined,
        flightType: resolveFlightType(summary.type),
        origin: resolveAirportFromSummary(summary, "origin") ?? undefined,
        landedAt: summary.datetime_landed,
      });
      clusters.set(airport.airportCode, cluster);
    }

    return Array.from(clusters.values())
      .map((cluster) => ({
        ...cluster,
        flights: cluster.flights.sort((a, b) => (b.landedAt ?? "").localeCompare(a.landedAt ?? "")),
      }))
      .sort((a, b) => b.flights.length - a.flights.length);
  } catch (err) {
    console.warn("[fr24] landed summary error:", (err as Error).message);
    return [];
  }
}

export async function getSaudiaCargoFlights(): Promise<SaudiaFlightResult> {
  return getSaudiaFlights();
}

function dedupeByFr24Id(positions: Fr24LivePosition[]) {
  const byId = new Map<string, Fr24LivePosition>();
  for (const position of positions) {
    const existing = byId.get(position.fr24_id);
    if (!existing || shouldReplacePosition(existing, position)) {
      byId.set(position.fr24_id, position);
    }
  }
  return Array.from(byId.values());
}

function shouldReplacePosition(existing: Fr24LivePosition, candidate: Fr24LivePosition) {
  const existingFreighter = isCargoPriorityPosition(existing);
  const candidateFreighter = isCargoPriorityPosition(candidate);

  if (candidateFreighter && !existingFreighter) return true;
  if (!candidateFreighter && existingFreighter) return false;

  return (candidate.query_priority ?? Number.MAX_SAFE_INTEGER) < (existing.query_priority ?? Number.MAX_SAFE_INTEGER);
}

function isCargoPriorityPosition(position: Fr24LivePosition) {
  return (
    position.query_kind === "cargo-priority" ||
    position.category === "C" ||
    position.cargo_hint === "freighter" ||
    isFreighterAircraft(position.type, aircraftModelLabel(position.type))
  );
}

async function getKnownFreighterRegistrations() {
  try {
    const storedFleet = await getStoredFleetAircraft(SAUDIA_ICAO);
    return storedFleet
      .filter((aircraft) => isStoredFleetFreighter(aircraft))
      .map((aircraft) => aircraft.registration)
      .filter(Boolean)
      .slice(0, 30);
  } catch {
    return [];
  }
}

function isStoredFleetFreighter(aircraft: Awaited<ReturnType<typeof getStoredFleetAircraft>>[number]) {
  return (
    isFreighterAircraft(aircraft.aircraft_type, aircraft.aircraft_model) ||
    getNestedString(aircraft.raw_payload, ["normalized", "flight_type"]) === "freighter" ||
    getNestedString(aircraft.raw_payload, ["live_position", "category"]) === "C" ||
    getNestedString(aircraft.raw_payload, ["live_position", "cargo_hint"]) === "freighter"
  );
}

function getNestedString(payload: Record<string, unknown>, path: string[]) {
  let current: unknown = payload;
  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : undefined;
}

function dedupeSummaries(records: Fr24SummaryRecord[]) {
  return Array.from(new Map(records.map((record) => [record.fr24_id, record])).values());
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function formatFr24Date(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "");
}
