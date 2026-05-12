/**
 * Flightradar24 API v1 client — server-side only.
 * Explorer plan endpoints used:
 *   1. GET /api/live/flight-positions/full?painted_as=SVA&categories=C
 *      (live Saudia-painted flights classified by FR24 as cargo-only)
 *   2. GET /api/flight-summary/light?flight_ids=...
 *      (optional route enrichment when live records are incomplete)
 *
 * Credit strategy: 1 API call per 5-minute cache window in the normal path.
 * Origin/destination from FR24; coordinates from static AIRPORTS map.
 * Falls back to static schedule data when API key absent or calls fail.
 */

import { unstable_cache } from "next/cache";
import type { FlightTrackerRecord, AirportPoint } from "@/lib/dummy-flight-data";
import {
  SAUDIA_CARGO,
  SAUDIA_GSA_PARTNERS,
  AIRPORTS,
  ICAO_TO_IATA,
} from "@/lib/saudia-cargo-data";
import {
  generateSyntheticRevenue,
  generateProductMix,
  generateCargoDestinations,
} from "@/lib/services/synthetic-revenue";

const FR24_BASE = "https://fr24api.flightradar24.com";
const API_KEY = process.env.FLIGHTRADAR24_API_KEY;

// ── FR24 types ────────────────────────────────────────────────────────────────

type Fr24LivePosition = {
  fr24_id: string;
  flight?: string;
  callsign?: string;
  lat: number;
  lon: number;
  track?: number;
  alt?: number;
  gspeed?: number;
  type?: string;
  reg?: string;
  painted_as?: string;
  operating_as?: string;
  orig_iata?: string;
  orig_icao?: string;
  dest_iata?: string;
  dest_icao?: string;
  dest_iata_actual?: string;
  dest_icao_actual?: string;
};

type Fr24LiveResponse = { data: Fr24LivePosition[] };
type Fr24LiveFetchResult = { data: Fr24LivePosition[]; fetchedAt: string };

type Fr24SummaryRecord = {
  fr24_id: string;
  flight?: string;
  reg?: string;
  type?: string;
  orig_iata?: string;
  orig_icao?: string;
  dest_iata?: string;
  dest_icao?: string;
  dest_iata_actual?: string;
  dest_icao_actual?: string;
};

type Fr24SummaryResponse = { data: Fr24SummaryRecord[] };

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Accept-Version": "v1",
    Accept: "application/json",
  };
}

// Saudia Cargo dedicated freighter ICAO codes
const FREIGHTER_TYPES = new Set(["B77F", "B748", "B74F", "B74S", "MD11"]);

// Source: saudia-cargo.com/our-fleet — B777-368ER, A330-300, B777-268, B787-9, A321, A320
const fetchLivePositions = unstable_cache(async (): Promise<Fr24LiveFetchResult> => {
  const fetchedAt = new Date().toISOString();
  const res = await fetch(
    `${FR24_BASE}/api/live/flight-positions/full?painted_as=SVA&categories=C&limit=100`,
    { headers: headers(), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`live-positions HTTP ${res.status}`);
  return { data: ((await res.json()) as Fr24LiveResponse).data ?? [], fetchedAt };
}, ["fr24-saudia-cargo-live-positions-v2"], { revalidate: 300 });

function resolveFlightType(icaoType: string | undefined, fr24CargoCategory = false): "freighter" | "belly" {
  if (fr24CargoCategory) return "freighter";
  if (!icaoType) return "belly";
  return FREIGHTER_TYPES.has(icaoType) ? "freighter" : "belly";
}

async function fetchFlightSummary(fr24Ids: string[]): Promise<Map<string, Fr24SummaryRecord>> {
  if (fr24Ids.length === 0) return new Map();

  // Max 15 IDs per call per API spec
  const ids = fr24Ids.slice(0, 15).join(",");
  const res = await fetch(
    `${FR24_BASE}/api/flight-summary/light?flight_ids=${ids}&limit=50`,
    { headers: headers(), next: { revalidate: 300 } }
  );
  if (!res.ok) return new Map();
  const json = (await res.json()) as Fr24SummaryResponse;
  return new Map((json.data ?? []).map((r) => [r.fr24_id, r]));
}

// ── Airport resolution ────────────────────────────────────────────────────────

function resolveByIcao(icao: string | undefined): AirportPoint | null {
  if (!icao) return null;
  const iata = ICAO_TO_IATA[icao];
  return iata ? (AIRPORTS[iata] ?? null) : null;
}

function resolveByIata(iata: string | undefined): AirportPoint | null {
  return iata ? (AIRPORTS[iata] ?? null) : null;
}

// ── GSA assignment ────────────────────────────────────────────────────────────

function pickGsa(flightNumber: string) {
  const n = parseInt(flightNumber.replace(/\D/g, "")) || 0;
  return SAUDIA_GSA_PARTNERS[n % SAUDIA_GSA_PARTNERS.length];
}

// ── Record builder ────────────────────────────────────────────────────────────

function buildRecord(
  pos: Fr24LivePosition,
  summary: Fr24SummaryRecord | undefined,
  index: number
): FlightTrackerRecord | null {
  // Flight number: prefer summary, derive from callsign, fall back to index
  const flightNumber =
    summary?.flight ??
    pos.flight ??
    (pos.callsign ? pos.callsign.replace(/^SVA?/, "SV") : `SV${800 + index}`);

  // Resolve origin/destination strictly from FR24 route fields.
  // No static fallback — stale hardcoded routes cause wrong data.
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

  // Drop flight if route can't be confirmed from live data
  if (!origin || !destination) return null;

  const rev = generateSyntheticRevenue(flightNumber, origin.airportCode, destination.airportCode);
  const gsa = pickGsa(flightNumber);

  return {
    id: pos.fr24_id,
    flightNumber,
    airlineName: SAUDIA_CARGO.name,
    airlineColor: SAUDIA_CARGO.color,
    gsaName: gsa.name,
    gsaColor: gsa.color,
    origin,
    destination,
    currentPosition: { lat: pos.lat, lng: pos.lon },
    track: pos.track,
    altitude: pos.alt,
    gspeed: pos.gspeed,
    registration: summary?.reg ?? pos.reg,
    aircraftType: summary?.type ?? pos.type,
    flightType: resolveFlightType(summary?.type ?? pos.type, true),
    tonnage: rev.tonnage,
    loadFactor: rev.loadFactor,
    revenue: rev.revenue,
    averageYield: rev.averageYield,
    products: generateProductMix(destination.airportCode),
    soldBy: index % 3 === 0 ? "airline" : "gsa",
    salesTeam: gsa.name,
    responsibleGsa: gsa.name,
    cargoDestinations: generateCargoDestinations(destination.airportCode, destination.countryCode),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export type FlightDataSource = "live" | "no-key" | "no-flights" | "error";
export type SaudiaFlightResult = {
  flights: FlightTrackerRecord[];
  source: FlightDataSource;
  fetchedAt: string;
};

export async function getSaudiaCargoFlights(): Promise<SaudiaFlightResult> {
  const fallbackFetchedAt = new Date().toISOString();

  if (!API_KEY) {
    return { flights: [], source: "no-key", fetchedAt: fallbackFetchedAt };
  }

  try {
    const liveResult = await fetchLivePositions();
    const fetchedAt = liveResult.fetchedAt;
    const allPositions = liveResult.data;
    // Exclude aircraft on the ground or taxiing (alt < 500 ft)
    const positions = allPositions.filter((p) => (p.alt ?? 0) > 500);
    if (positions.length === 0) {
      return { flights: [], source: "no-flights", fetchedAt };
    }

    const missingRoutePositions = positions.filter(
      (p) => !(p.orig_icao || p.orig_iata) || !(p.dest_icao_actual || p.dest_icao || p.dest_iata_actual || p.dest_iata)
    );
    const summaryMap = await fetchFlightSummary(missingRoutePositions.map((p) => p.fr24_id));
    const flights = positions
      .map((pos, i) => buildRecord(pos, summaryMap.get(pos.fr24_id), i))
      .filter((f): f is FlightTrackerRecord => f !== null);

    return { flights, source: flights.length > 0 ? "live" : "no-flights", fetchedAt };
  } catch (err) {
    console.warn("[fr24] API error:", (err as Error).message);
    return { flights: [], source: "error", fetchedAt: fallbackFetchedAt };
  }
}
