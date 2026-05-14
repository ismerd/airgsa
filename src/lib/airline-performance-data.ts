import { realGsaPartners } from "./real-gsa-data";

export type RouteBreakdown = {
  route: string;
  destination: string;
  revenue: number;
  tonnage: number;
  loadFactor: number;
  yieldPerKg: number;
  flightCount: number;
};

export type AirportBreakdown = {
  airportCode: string;
  airportName: string;
  city: string;
  revenue: number;
  tonnage: number;
  loadFactor: number;
  yieldPerKg: number;
  flightCount: number;
  topRoute: string;
  routes: RouteBreakdown[];
};

export type CountryPerformance = {
  country: string;
  code: string; // ISO 3166-1 alpha-2
  localCurrencyCode: string; // ISO 4217
  region: string;
  revenue: number;
  yieldPerKg: number;
  loadFactor: number;
  tonnage: number;
  topLane: string;
  airports: AirportBreakdown[];
  mapCenter: {
    lat: number;
    lng: number;
  };
  mapFootprint: [number, number][];
};

export type GsaPerformance = {
  gsaName: string;
  assignedMarkets: string;
  revenue: number;
  yieldPerKg: number;
  loadFactor: number;
  tonnage: number;
  flightCount: number;
};

export type PerformancePeriod = "daily" | "weekly" | "monthly" | "yearly";

export type PeriodAveragePerformance = {
  period: PerformancePeriod;
  label: string;
  revenue: number;
  yieldPerKg: number;
  loadFactor: number;
  tonnage: number;
  flightCount: number;
};

export const performancePeriodOptions: { id: PerformancePeriod; label: string; description: string }[] = [
  { id: "daily", label: "Daily", description: "Average day" },
  { id: "weekly", label: "Weekly", description: "Average week" },
  { id: "monthly", label: "Monthly", description: "Average month" },
  { id: "yearly", label: "Yearly", description: "Projected year" },
];

function routeBreakdown(
  origin: string,
  routes: Array<{ destination: string; revenue: number; tonnage: number; loadFactor: number; yieldPerKg: number; flightCount: number }>,
): RouteBreakdown[] {
  return routes
    .map((route) => ({
      ...route,
      route: `${origin}-${route.destination}`,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

const monthlyCountryPerformance: CountryPerformance[] = [
  {
    country: "Germany",
    code: "DE",
    localCurrencyCode: "EUR",
    region: "DACH",
    revenue: 482000,
    yieldPerKg: 2.68,
    loadFactor: 84,
    tonnage: 179.8,
    topLane: "FRA-DXB",
    airports: [
      { airportCode: "FRA", airportName: "Frankfurt Airport", city: "Frankfurt", revenue: 265100, tonnage: 98.9, loadFactor: 86, yieldPerKg: 2.68, flightCount: 23, topRoute: "FRA-DXB", routes: routeBreakdown("FRA", [
        { destination: "DXB", revenue: 112400, tonnage: 41.7, loadFactor: 89, yieldPerKg: 2.70, flightCount: 9 },
        { destination: "JED", revenue: 78600, tonnage: 29.6, loadFactor: 86, yieldPerKg: 2.66, flightCount: 7 },
        { destination: "RUH", revenue: 48100, tonnage: 18.2, loadFactor: 82, yieldPerKg: 2.64, flightCount: 5 },
        { destination: "HKG", revenue: 26000, tonnage: 9.4, loadFactor: 78, yieldPerKg: 2.77, flightCount: 2 },
      ]) },
      { airportCode: "MUC", airportName: "Munich Airport", city: "Munich", revenue: 168700, tonnage: 62.9, loadFactor: 83, yieldPerKg: 2.68, flightCount: 15, topRoute: "MUC-SIN", routes: routeBreakdown("MUC", [
        { destination: "SIN", revenue: 68400, tonnage: 24.8, loadFactor: 87, yieldPerKg: 2.76, flightCount: 6 },
        { destination: "JED", revenue: 50200, tonnage: 19.1, loadFactor: 83, yieldPerKg: 2.63, flightCount: 5 },
        { destination: "DXB", revenue: 32100, tonnage: 12.3, loadFactor: 79, yieldPerKg: 2.61, flightCount: 3 },
        { destination: "DMM", revenue: 18000, tonnage: 6.7, loadFactor: 74, yieldPerKg: 2.69, flightCount: 1 },
      ]) },
      { airportCode: "DUS", airportName: "Düsseldorf Airport", city: "Düsseldorf", revenue: 48200, tonnage: 18.0, loadFactor: 78, yieldPerKg: 2.68, flightCount: 5, topRoute: "DUS-IST", routes: routeBreakdown("DUS", [
        { destination: "IST", revenue: 21100, tonnage: 7.9, loadFactor: 81, yieldPerKg: 2.67, flightCount: 2 },
        { destination: "JED", revenue: 16800, tonnage: 6.2, loadFactor: 76, yieldPerKg: 2.71, flightCount: 2 },
        { destination: "DXB", revenue: 10300, tonnage: 3.9, loadFactor: 72, yieldPerKg: 2.64, flightCount: 1 },
      ]) },
    ],
    mapCenter: { lat: 51.1657, lng: 10.4515 },
    mapFootprint: [
      [55.1, 6.1],
      [54.6, 14.9],
      [50.2, 15.0],
      [47.2, 11.2],
      [47.6, 6.7],
      [51.0, 5.8],
    ],
  },
  {
    country: "Austria",
    code: "AT",
    localCurrencyCode: "EUR",
    region: "DACH",
    revenue: 218500,
    yieldPerKg: 2.41,
    loadFactor: 76,
    tonnage: 90.7,
    topLane: "VIE-DOH",
    airports: [
      { airportCode: "VIE", airportName: "Vienna International Airport", city: "Vienna", revenue: 218500, tonnage: 90.7, loadFactor: 76, yieldPerKg: 2.41, flightCount: 18, topRoute: "VIE-DOH", routes: routeBreakdown("VIE", [
        { destination: "DOH", revenue: 81100, tonnage: 33.1, loadFactor: 79, yieldPerKg: 2.45, flightCount: 7 },
        { destination: "JED", revenue: 64200, tonnage: 27.3, loadFactor: 76, yieldPerKg: 2.35, flightCount: 5 },
        { destination: "DXB", revenue: 47900, tonnage: 19.6, loadFactor: 74, yieldPerKg: 2.44, flightCount: 4 },
        { destination: "RUH", revenue: 25300, tonnage: 10.7, loadFactor: 70, yieldPerKg: 2.36, flightCount: 2 },
      ]) },
    ],
    mapCenter: { lat: 47.5162, lng: 14.5501 },
    mapFootprint: [
      [49.1, 9.5],
      [49.0, 17.2],
      [47.7, 17.1],
      [46.4, 13.4],
      [46.6, 9.6],
    ],
  },
  {
    country: "Switzerland",
    code: "CH",
    localCurrencyCode: "CHF",
    region: "DACH",
    revenue: 191200,
    yieldPerKg: 2.93,
    loadFactor: 81,
    tonnage: 65.3,
    topLane: "ZRH-SIN",
    airports: [
      { airportCode: "ZRH", airportName: "Zurich Airport", city: "Zurich", revenue: 152960, tonnage: 52.2, loadFactor: 83, yieldPerKg: 2.93, flightCount: 14, topRoute: "ZRH-SIN", routes: routeBreakdown("ZRH", [
        { destination: "SIN", revenue: 61200, tonnage: 20.3, loadFactor: 86, yieldPerKg: 3.01, flightCount: 5 },
        { destination: "DXB", revenue: 47240, tonnage: 16.2, loadFactor: 83, yieldPerKg: 2.92, flightCount: 4 },
        { destination: "JED", revenue: 28600, tonnage: 9.9, loadFactor: 79, yieldPerKg: 2.89, flightCount: 3 },
        { destination: "HKG", revenue: 15920, tonnage: 5.8, loadFactor: 75, yieldPerKg: 2.74, flightCount: 2 },
      ]) },
      { airportCode: "GVA", airportName: "Geneva Airport", city: "Geneva", revenue: 38240, tonnage: 13.1, loadFactor: 76, yieldPerKg: 2.92, flightCount: 4, topRoute: "GVA-DXB", routes: routeBreakdown("GVA", [
        { destination: "DXB", revenue: 17400, tonnage: 5.9, loadFactor: 79, yieldPerKg: 2.95, flightCount: 2 },
        { destination: "JED", revenue: 12840, tonnage: 4.4, loadFactor: 75, yieldPerKg: 2.92, flightCount: 1 },
        { destination: "RUH", revenue: 8000, tonnage: 2.8, loadFactor: 70, yieldPerKg: 2.86, flightCount: 1 },
      ]) },
    ],
    mapCenter: { lat: 46.8182, lng: 8.2275 },
    mapFootprint: [
      [47.8, 5.9],
      [47.7, 10.5],
      [46.1, 10.4],
      [45.8, 7.0],
      [46.3, 5.9],
    ],
  },
  {
    country: "United Arab Emirates",
    code: "AE",
    localCurrencyCode: "AED",
    region: "Middle East",
    revenue: 264700,
    yieldPerKg: 2.52,
    loadFactor: 79,
    tonnage: 105.1,
    topLane: "DXB-FRA",
    airports: [
      { airportCode: "DXB", airportName: "Dubai International Airport", city: "Dubai", revenue: 198525, tonnage: 78.8, loadFactor: 81, yieldPerKg: 2.52, flightCount: 22, topRoute: "DXB-FRA", routes: routeBreakdown("DXB", [
        { destination: "FRA", revenue: 82400, tonnage: 32.1, loadFactor: 84, yieldPerKg: 2.57, flightCount: 9 },
        { destination: "MAD", revenue: 46325, tonnage: 18.9, loadFactor: 80, yieldPerKg: 2.45, flightCount: 5 },
        { destination: "JNB", revenue: 39200, tonnage: 15.4, loadFactor: 79, yieldPerKg: 2.55, flightCount: 4 },
        { destination: "HKG", revenue: 30600, tonnage: 12.4, loadFactor: 77, yieldPerKg: 2.47, flightCount: 4 },
      ]) },
      { airportCode: "AUH", airportName: "Abu Dhabi International Airport", city: "Abu Dhabi", revenue: 66175, tonnage: 26.3, loadFactor: 74, yieldPerKg: 2.52, flightCount: 8, topRoute: "AUH-LHR", routes: routeBreakdown("AUH", [
        { destination: "LHR", revenue: 28100, tonnage: 11.0, loadFactor: 77, yieldPerKg: 2.55, flightCount: 3 },
        { destination: "FRA", revenue: 18875, tonnage: 7.6, loadFactor: 73, yieldPerKg: 2.48, flightCount: 2 },
        { destination: "JED", revenue: 11200, tonnage: 4.5, loadFactor: 72, yieldPerKg: 2.49, flightCount: 2 },
        { destination: "MUC", revenue: 8000, tonnage: 3.2, loadFactor: 68, yieldPerKg: 2.50, flightCount: 1 },
      ]) },
    ],
    mapCenter: { lat: 23.4241, lng: 53.8478 },
    mapFootprint: [
      [26.2, 51.5],
      [26.1, 56.4],
      [24.0, 56.3],
      [22.6, 55.3],
      [22.6, 51.6],
    ],
  },
  {
    country: "Singapore",
    code: "SG",
    localCurrencyCode: "SGD",
    region: "Asia",
    revenue: 236400,
    yieldPerKg: 3.18,
    loadFactor: 88,
    tonnage: 74.3,
    topLane: "SIN-MUC",
    airports: [
      { airportCode: "SIN", airportName: "Singapore Changi Airport", city: "Singapore", revenue: 236400, tonnage: 74.3, loadFactor: 88, yieldPerKg: 3.18, flightCount: 19, topRoute: "SIN-MUC", routes: routeBreakdown("SIN", [
        { destination: "MUC", revenue: 89200, tonnage: 27.8, loadFactor: 91, yieldPerKg: 3.21, flightCount: 7 },
        { destination: "FRA", revenue: 70400, tonnage: 22.1, loadFactor: 89, yieldPerKg: 3.19, flightCount: 6 },
        { destination: "JED", revenue: 47800, tonnage: 15.0, loadFactor: 86, yieldPerKg: 3.19, flightCount: 4 },
        { destination: "DXB", revenue: 29000, tonnage: 9.4, loadFactor: 82, yieldPerKg: 3.09, flightCount: 2 },
      ]) },
    ],
    mapCenter: { lat: 1.3521, lng: 103.8198 },
    mapFootprint: [
      [1.55, 103.55],
      [1.55, 104.1],
      [1.15, 104.1],
      [1.15, 103.55],
    ],
  },
  {
    country: "Spain",
    code: "ES",
    localCurrencyCode: "EUR",
    region: "Iberia",
    revenue: 143800,
    yieldPerKg: 2.22,
    loadFactor: 69,
    tonnage: 64.8,
    topLane: "BCN-MEX",
    airports: [
      { airportCode: "MAD", airportName: "Adolfo Suárez Madrid-Barajas", city: "Madrid", revenue: 79090, tonnage: 35.6, loadFactor: 70, yieldPerKg: 2.22, flightCount: 12, topRoute: "MAD-JFK", routes: routeBreakdown("MAD", [
        { destination: "JFK", revenue: 31100, tonnage: 13.7, loadFactor: 73, yieldPerKg: 2.27, flightCount: 5 },
        { destination: "DXB", revenue: 22990, tonnage: 10.4, loadFactor: 70, yieldPerKg: 2.21, flightCount: 3 },
        { destination: "JED", revenue: 15000, tonnage: 6.8, loadFactor: 67, yieldPerKg: 2.21, flightCount: 2 },
        { destination: "LIM", revenue: 10000, tonnage: 4.7, loadFactor: 63, yieldPerKg: 2.13, flightCount: 2 },
      ]) },
      { airportCode: "BCN", airportName: "Barcelona-El Prat Airport", city: "Barcelona", revenue: 50330, tonnage: 22.7, loadFactor: 68, yieldPerKg: 2.22, flightCount: 8, topRoute: "BCN-MEX", routes: routeBreakdown("BCN", [
        { destination: "MEX", revenue: 20500, tonnage: 9.1, loadFactor: 71, yieldPerKg: 2.25, flightCount: 3 },
        { destination: "JED", revenue: 14130, tonnage: 6.4, loadFactor: 68, yieldPerKg: 2.21, flightCount: 2 },
        { destination: "DXB", revenue: 9900, tonnage: 4.5, loadFactor: 65, yieldPerKg: 2.20, flightCount: 2 },
        { destination: "CAI", revenue: 5800, tonnage: 2.7, loadFactor: 61, yieldPerKg: 2.15, flightCount: 1 },
      ]) },
      { airportCode: "VLC", airportName: "Valencia Airport", city: "Valencia", revenue: 14380, tonnage: 6.5, loadFactor: 65, yieldPerKg: 2.21, flightCount: 3, topRoute: "VLC-LIM", routes: routeBreakdown("VLC", [
        { destination: "LIM", revenue: 6400, tonnage: 2.9, loadFactor: 67, yieldPerKg: 2.21, flightCount: 1 },
        { destination: "JED", revenue: 4880, tonnage: 2.2, loadFactor: 64, yieldPerKg: 2.22, flightCount: 1 },
        { destination: "DXB", revenue: 3100, tonnage: 1.4, loadFactor: 61, yieldPerKg: 2.21, flightCount: 1 },
      ]) },
    ],
    mapCenter: { lat: 40.4637, lng: -3.7492 },
    mapFootprint: [
      [43.8, -9.3],
      [43.5, 3.3],
      [40.2, 4.2],
      [36.0, -5.6],
      [38.7, -9.5],
    ],
  },
];

const monthlyGsaPerformance: GsaPerformance[] = [
  gsaPerformanceSeed("gsa-air-menzies", {
    revenue: 1860000,
    yieldPerKg: 3.18,
    loadFactor: 91,
    tonnage: 584.8,
    flightCount: 46,
  }),
  gsaPerformanceSeed("gsa-aeb", {
    revenue: 1435000,
    yieldPerKg: 2.96,
    loadFactor: 87,
    tonnage: 484.8,
    flightCount: 38,
  }),
  gsaPerformanceSeed("gsa-cargo-airlines-services", {
    revenue: 1085000,
    yieldPerKg: 2.88,
    loadFactor: 84,
    tonnage: 376.7,
    flightCount: 31,
  }),
  gsaPerformanceSeed("gsa-forto", {
    revenue: 835000,
    yieldPerKg: 2.62,
    loadFactor: 78,
    tonnage: 318.7,
    flightCount: 25,
  }),
  gsaPerformanceSeed("gsa-priority-freight", {
    revenue: 675000,
    yieldPerKg: 3.05,
    loadFactor: 81,
    tonnage: 221.3,
    flightCount: 19,
  }),
  gsaPerformanceSeed("gsa-aerotrans", {
    revenue: 492000,
    yieldPerKg: 2.44,
    loadFactor: 73,
    tonnage: 201.6,
    flightCount: 15,
  }),
  gsaPerformanceSeed("gsa-sky-art", {
    revenue: 318000,
    yieldPerKg: 2.28,
    loadFactor: 68,
    tonnage: 139.5,
    flightCount: 11,
  }),
  gsaPerformanceSeed("gsa-teconja", {
    revenue: 184000,
    yieldPerKg: 2.11,
    loadFactor: 61,
    tonnage: 87.2,
    flightCount: 7,
  }),
];

function gsaPerformanceSeed(
  partnerId: string,
  metrics: Omit<GsaPerformance, "gsaName" | "assignedMarkets">,
): GsaPerformance {
  const partner = realGsaPartners.find((item) => item.id === partnerId);
  if (!partner) throw new Error(`Missing GSA partner seed: ${partnerId}`);

  return {
    gsaName: partner.name,
    assignedMarkets: partner.markets.join(", "),
    ...metrics,
  };
}
const periodConfigs: Record<PerformancePeriod, { label: string; factor: number; yieldDelta: number; loadFactorDelta: number }> = {
  daily: { label: "Daily average", factor: 1 / 30, yieldDelta: -0.09, loadFactorDelta: -3 },
  weekly: { label: "Weekly average", factor: 7 / 30, yieldDelta: -0.04, loadFactorDelta: -1 },
  monthly: { label: "Monthly average", factor: 1, yieldDelta: 0, loadFactorDelta: 0 },
  yearly: { label: "Yearly projection", factor: 12, yieldDelta: 0.03, loadFactorDelta: 1 },
};

export const countryPerformanceByPeriod: Record<PerformancePeriod, CountryPerformance[]> = {
  daily: monthlyCountryPerformance.map((row) => scaleCountryPerformance(row, "daily")),
  weekly: monthlyCountryPerformance.map((row) => scaleCountryPerformance(row, "weekly")),
  monthly: monthlyCountryPerformance,
  yearly: monthlyCountryPerformance.map((row) => scaleCountryPerformance(row, "yearly")),
};

export const gsaPerformanceByPeriod: Record<PerformancePeriod, GsaPerformance[]> = {
  daily: monthlyGsaPerformance.map((row) => scaleGsaPerformance(row, "daily")),
  weekly: monthlyGsaPerformance.map((row) => scaleGsaPerformance(row, "weekly")),
  monthly: monthlyGsaPerformance,
  yearly: monthlyGsaPerformance.map((row) => scaleGsaPerformance(row, "yearly")),
};

export const periodAveragePerformance: PeriodAveragePerformance[] = performancePeriodOptions.map((option) => {
  const countries = countryPerformanceByPeriod[option.id];
  const gsas = gsaPerformanceByPeriod[option.id];
  const revenue = countries.reduce((sum, row) => sum + row.revenue, 0);
  const tonnage = countries.reduce((sum, row) => sum + row.tonnage, 0);
  const loadFactor = Math.round(countries.reduce((sum, row) => sum + row.loadFactor, 0) / countries.length);
  const flightCount = gsas.reduce((sum, row) => sum + row.flightCount, 0);

  return {
    period: option.id,
    label: periodConfigs[option.id].label,
    revenue,
    yieldPerKg: tonnage === 0 ? 0 : revenue / (tonnage * 1000),
    loadFactor,
    tonnage,
    flightCount,
  };
});

export const countryPerformance = countryPerformanceByPeriod.monthly;
export const gsaPerformance = gsaPerformanceByPeriod.monthly;

export function scaleCountryByFactor(factor: number): CountryPerformance[] {
  return monthlyCountryPerformance.map((row) => ({
    ...row,
    revenue: Math.round(row.revenue * factor),
    tonnage: roundToOne(row.tonnage * factor),
  }));
}

export function scaleGsaByFactor(factor: number): GsaPerformance[] {
  return monthlyGsaPerformance.map((row) => ({
    ...row,
    revenue: Math.round(row.revenue * factor),
    tonnage: roundToOne(row.tonnage * factor),
    flightCount: Math.max(1, Math.round(row.flightCount * factor)),
  }));
}

function scaleCountryPerformance(row: CountryPerformance, period: PerformancePeriod): CountryPerformance {
  const config = periodConfigs[period];

  return {
    ...row,
    revenue: Math.round(row.revenue * config.factor),
    yieldPerKg: roundToTwo(row.yieldPerKg + config.yieldDelta),
    loadFactor: clampLoadFactor(row.loadFactor + config.loadFactorDelta),
    tonnage: roundToOne(row.tonnage * config.factor),
    airports: row.airports.map((a) => ({
      ...a,
      revenue: Math.round(a.revenue * config.factor),
      yieldPerKg: roundToTwo(a.yieldPerKg + config.yieldDelta),
      loadFactor: clampLoadFactor(a.loadFactor + config.loadFactorDelta),
      tonnage: roundToOne(a.tonnage * config.factor),
      flightCount: Math.max(1, Math.round(a.flightCount * config.factor)),
      routes: a.routes.map((route) => ({
        ...route,
        revenue: Math.round(route.revenue * config.factor),
        yieldPerKg: roundToTwo(route.yieldPerKg + config.yieldDelta),
        loadFactor: clampLoadFactor(route.loadFactor + config.loadFactorDelta),
        tonnage: roundToOne(route.tonnage * config.factor),
        flightCount: Math.max(1, Math.round(route.flightCount * config.factor)),
      })),
    })),
  };
}

function scaleGsaPerformance(row: GsaPerformance, period: PerformancePeriod): GsaPerformance {
  const config = periodConfigs[period];

  return {
    ...row,
    revenue: Math.round(row.revenue * config.factor),
    yieldPerKg: roundToTwo(row.yieldPerKg + config.yieldDelta),
    loadFactor: clampLoadFactor(row.loadFactor + config.loadFactorDelta),
    tonnage: roundToOne(row.tonnage * config.factor),
    flightCount: Math.max(1, Math.round(row.flightCount * config.factor)),
  };
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function clampLoadFactor(value: number) {
  return Math.min(96, Math.max(45, Math.round(value)));
}
