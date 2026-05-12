/**
 * Deterministic synthetic revenue generation for Saudia Cargo flights.
 * All values here are SIMULATED / ESTIMATED — not sourced from the FR24 API.
 * They are seeded from real flight identifiers so numbers are stable across reloads.
 */

// Simple deterministic integer hash (djb2)
function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Returns a float in [min, max) deterministically seeded by `seed`. */
function deterministicFloat(seed: string, min: number, max: number): number {
  const h = djb2(seed);
  return min + ((h % 10000) / 10000) * (max - min);
}

// Approximate great-circle distances (km) for key Saudia Cargo lane pairs
const ROUTE_KM: Record<string, number> = {
  "JED-FRA": 5020,
  "FRA-JED": 5020,
  "JED-LHR": 5100,
  "LHR-JED": 5100,
  "JED-CDG": 5230,
  "CDG-JED": 5230,
  "JED-AMS": 5180,
  "AMS-JED": 5180,
  "JED-JFK": 10480,
  "JFK-JED": 10480,
  "JED-ORD": 11040,
  "ORD-JED": 11040,
  "JED-HKG": 7380,
  "HKG-JED": 7380,
  "JED-SIN": 7090,
  "SIN-JED": 7090,
  "JED-NRT": 9380,
  "NRT-JED": 9380,
  "JED-BOM": 2730,
  "BOM-JED": 2730,
  "JED-CGO": 7500,
  "CGO-JED": 7500,
  "RUH-FRA": 4930,
  "FRA-RUH": 4930,
  "RUH-LHR": 5060,
  "LHR-RUH": 5060,
  "JED-DOH": 880,
  "DOH-JED": 880,
  "JED-KWI": 1180,
  "KWI-JED": 1180,
};

function routeDistanceKm(origin: string, destination: string): number {
  return ROUTE_KM[`${origin}-${destination}`] ?? 4000;
}

// Yield bands ($/kg) scale with distance: long-haul yields more per kg
function baseYield(distKm: number): number {
  if (distKm < 2000) return 2.1;
  if (distKm < 5000) return 2.6;
  if (distKm < 8000) return 2.95;
  return 3.25;
}

export type SyntheticRevenue = {
  /** Simulated — estimated from route length and typical load */
  tonnage: number;
  /** Simulated — estimated load factor */
  loadFactor: number;
  /** Simulated — estimated revenue in USD */
  revenue: number;
  /** Simulated — estimated average yield in USD/kg */
  averageYield: number;
};

/**
 * Generate stable, plausible commercial metrics for a flight.
 * Inputs come from real FR24 data (flightNumber, origin, destination);
 * all returned values are simulated.
 */
export function generateSyntheticRevenue(
  flightNumber: string,
  origin: string,
  destination: string
): SyntheticRevenue {
  const seed = `${flightNumber}-${origin}-${destination}`;
  const distKm = routeDistanceKm(origin, destination);

  // Tonnage: Saudia Cargo B747-8F capacity ~112t; we show per-booking/ULD slice
  const tonnage = parseFloat(
    deterministicFloat(seed + "-t", 14.2, 23.8).toFixed(1)
  );

  // Load factor: 68–93%
  const loadFactor = Math.round(deterministicFloat(seed + "-lf", 68, 93));

  // Yield: scales with distance, slight variance
  const yieldBase = baseYield(distKm);
  const averageYield = parseFloat(
    deterministicFloat(seed + "-y", yieldBase - 0.25, yieldBase + 0.35).toFixed(2)
  );

  // Revenue = tonnage * 1000 kg * yield
  const revenue = Math.round(tonnage * 1000 * averageYield);

  return { tonnage, loadFactor, revenue, averageYield };
}

// Saudia Cargo product mix varies by destination region
export function generateProductMix(
  destination: string
): Record<string, number> {
  const seed = `mix-${destination}`;
  const h = djb2(seed);

  const region = destinationRegion(destination);

  switch (region) {
    case "europe":
      return { generalCargo: 40 + (h % 12), pharma: 22 + (h % 8), express: 18 + (h % 6), perishables: 20 - (h % 8) };
    case "northamerica":
      return { generalCargo: 35 + (h % 10), ecommerce: 28 + (h % 8), pharma: 20 + (h % 6), highValue: 17 - (h % 6) };
    case "asia":
      return { generalCargo: 38 + (h % 10), highValue: 25 + (h % 8), pharma: 22 + (h % 6), ecommerce: 15 - (h % 4) };
    case "middleeast":
      return { generalCargo: 50 + (h % 15), perishables: 25 + (h % 8), express: 25 - (h % 10) };
    default:
      return { generalCargo: 55, pharma: 20, perishables: 15, express: 10 };
  }
}

function destinationRegion(iata: string): string {
  const europe = ["FRA", "LHR", "CDG", "AMS", "ZRH", "MUC", "FCO", "MAD", "ARN", "CPH"];
  const northamerica = ["JFK", "ORD", "LAX", "MIA", "YYZ", "IAD"];
  const asia = ["HKG", "SIN", "NRT", "ICN", "PVG", "BKK", "CGO"];
  const middleeast = ["DOH", "DXB", "KWI", "BAH", "MCT", "AMM"];

  if (europe.includes(iata)) return "europe";
  if (northamerica.includes(iata)) return "northamerica";
  if (asia.includes(iata)) return "asia";
  if (middleeast.includes(iata)) return "middleeast";
  return "other";
}

export function generateCargoDestinations(
  destinationIata: string,
  destinationCountryCode: string
): { city: string; countryCode: string; percentage: number }[] {
  const seed = `dest-${destinationIata}`;
  const h = djb2(seed);

  const cityMap: Record<string, { city: string; countryCode: string }[]> = {
    FRA: [
      { city: "Frankfurt", countryCode: "DE" },
      { city: "Berlin", countryCode: "DE" },
      { city: "Munich", countryCode: "DE" },
      { city: "Hamburg", countryCode: "DE" },
    ],
    LHR: [
      { city: "London", countryCode: "GB" },
      { city: "Manchester", countryCode: "GB" },
      { city: "Birmingham", countryCode: "GB" },
      { city: "Leeds", countryCode: "GB" },
    ],
    CDG: [
      { city: "Paris", countryCode: "FR" },
      { city: "Lyon", countryCode: "FR" },
      { city: "Marseille", countryCode: "FR" },
      { city: "Brussels", countryCode: "BE" },
    ],
    AMS: [
      { city: "Amsterdam", countryCode: "NL" },
      { city: "Rotterdam", countryCode: "NL" },
      { city: "Brussels", countryCode: "BE" },
      { city: "Antwerp", countryCode: "BE" },
    ],
    JFK: [
      { city: "New York", countryCode: "US" },
      { city: "Newark", countryCode: "US" },
      { city: "Boston", countryCode: "US" },
      { city: "Philadelphia", countryCode: "US" },
    ],
    ORD: [
      { city: "Chicago", countryCode: "US" },
      { city: "Detroit", countryCode: "US" },
      { city: "Milwaukee", countryCode: "US" },
      { city: "Indianapolis", countryCode: "US" },
    ],
    HKG: [
      { city: "Hong Kong", countryCode: "HK" },
      { city: "Shenzhen", countryCode: "CN" },
      { city: "Guangzhou", countryCode: "CN" },
      { city: "Macau", countryCode: "MO" },
    ],
    SIN: [
      { city: "Singapore", countryCode: "SG" },
      { city: "Kuala Lumpur", countryCode: "MY" },
      { city: "Jakarta", countryCode: "ID" },
      { city: "Bangkok", countryCode: "TH" },
    ],
    NRT: [
      { city: "Tokyo", countryCode: "JP" },
      { city: "Osaka", countryCode: "JP" },
      { city: "Nagoya", countryCode: "JP" },
      { city: "Fukuoka", countryCode: "JP" },
    ],
    BOM: [
      { city: "Mumbai", countryCode: "IN" },
      { city: "Pune", countryCode: "IN" },
      { city: "Ahmedabad", countryCode: "IN" },
      { city: "Surat", countryCode: "IN" },
    ],
  };

  const cities =
    cityMap[destinationIata] ?? [
      { city: destinationIata, countryCode: destinationCountryCode },
      { city: "Transfer", countryCode: destinationCountryCode },
      { city: "Region Hub", countryCode: destinationCountryCode },
      { city: "Distribution", countryCode: destinationCountryCode },
    ];

  // Deterministic split across 4 cities summing to 100
  const base = 20 + (h % 15);
  const second = 22 + ((h >> 4) % 10);
  const third = 18 + ((h >> 8) % 8);
  const fourth = 100 - base - second - third;

  return cities.map((c, i) => ({
    ...c,
    percentage: [base, second, third, fourth][i] ?? 10,
  }));
}
