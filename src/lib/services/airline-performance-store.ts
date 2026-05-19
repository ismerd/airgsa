import { canViewContract } from "@/lib/auth/permissions";
import type { SessionPayload } from "@/lib/auth/session";
import type { CountryPerformance, GsaPerformance, PeriodAveragePerformance, RouteBreakdown } from "@/lib/performance-types";
import type { KpiPoint } from "@/lib/types";
import {
  listContractPerformance,
  listMandateBookings,
  listMandateQuotes,
  listMonthlyReports,
  type MandateBooking,
  type MandateQuote,
} from "@/lib/services/mandate-execution-store";
import { listLivePartnerContracts, type LiveContractRoute, type LivePartnerContract } from "@/lib/services/tender-workflow-store";

type AirportMeta = {
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  countryCode: string;
  localCurrencyCode: string;
  region: string;
  lat: number;
  lng: number;
};

type RouteAggregate = {
  route: string;
  origin: string;
  destination: string;
  revenue: number;
  weightKg: number;
  flightCount: number;
  loadFactorSum: number;
  loadFactorCount: number;
};

type AirportAggregate = AirportMeta & {
  revenue: number;
  weightKg: number;
  flightCount: number;
  routes: Map<string, RouteAggregate>;
};

type CountryAggregate = {
  meta: AirportMeta;
  revenue: number;
  weightKg: number;
  flightCount: number;
  loadFactorSum: number;
  loadFactorCount: number;
  airports: Map<string, AirportAggregate>;
};

type GsaAggregate = {
  gsaName: string;
  assignedMarkets: Set<string>;
  revenue: number;
  weightKg: number;
  flightCount: number;
  loadFactorSum: number;
  loadFactorCount: number;
};

export type AirlineOperationalPerformanceDashboard = {
  kpiData: KpiPoint[];
  countries: CountryPerformance[];
  gsas: GsaPerformance[];
  selectedAverage: PeriodAveragePerformance;
  watchlist: string[];
};

const AIRPORTS: Record<string, AirportMeta> = {
  AMS: airport("AMS", "Amsterdam Schiphol Airport", "Amsterdam", "Netherlands", "NL", "EUR", "Benelux", 52.3105, 4.7683),
  ATL: airport("ATL", "Hartsfield-Jackson Atlanta International Airport", "Atlanta", "United States of America", "US", "USD", "North America", 33.6407, -84.4277),
  BOM: airport("BOM", "Chhatrapati Shivaji Maharaj International Airport", "Mumbai", "India", "IN", "INR", "South Asia", 19.0896, 72.8656),
  BRU: airport("BRU", "Brussels Airport", "Brussels", "Belgium", "BE", "EUR", "Benelux", 50.9014, 4.4844),
  CDG: airport("CDG", "Paris Charles de Gaulle Airport", "Paris", "France", "FR", "EUR", "Western Europe", 49.0097, 2.5479),
  CPT: airport("CPT", "Cape Town International Airport", "Cape Town", "South Africa", "ZA", "ZAR", "Southern Africa", -33.9715, 18.6021),
  DMM: airport("DMM", "King Fahd International Airport", "Dammam", "Saudi Arabia", "SA", "SAR", "Middle East", 26.4712, 49.7979),
  DOH: airport("DOH", "Hamad International Airport", "Doha", "Qatar", "QA", "QAR", "Middle East", 25.2731, 51.6081),
  DUS: airport("DUS", "Dusseldorf Airport", "Dusseldorf", "Germany", "DE", "EUR", "DACH", 51.2895, 6.7668),
  DXB: airport("DXB", "Dubai International Airport", "Dubai", "United Arab Emirates", "AE", "AED", "Middle East", 25.2532, 55.3657),
  FRA: airport("FRA", "Frankfurt Airport", "Frankfurt", "Germany", "DE", "EUR", "DACH", 50.0379, 8.5622),
  HKG: airport("HKG", "Hong Kong International Airport", "Hong Kong", "Hong Kong", "HK", "HKD", "Greater China", 22.308, 113.9185),
  IST: airport("IST", "Istanbul Airport", "Istanbul", "Turkey", "TR", "TRY", "Turkey", 41.2753, 28.7519),
  JED: airport("JED", "King Abdulaziz International Airport", "Jeddah", "Saudi Arabia", "SA", "SAR", "Middle East", 21.6702, 39.1528),
  JNB: airport("JNB", "O. R. Tambo International Airport", "Johannesburg", "South Africa", "ZA", "ZAR", "Southern Africa", -26.1337, 28.242),
  LAX: airport("LAX", "Los Angeles International Airport", "Los Angeles", "United States of America", "US", "USD", "North America", 33.9416, -118.4085),
  LGG: airport("LGG", "Liege Airport", "Liege", "Belgium", "BE", "EUR", "Benelux", 50.6374, 5.4432),
  LHR: airport("LHR", "London Heathrow Airport", "London", "United Kingdom", "GB", "GBP", "United Kingdom", 51.47, -0.4543),
  MAD: airport("MAD", "Adolfo Suarez Madrid-Barajas Airport", "Madrid", "Spain", "ES", "EUR", "Southern Europe", 40.4983, -3.5676),
  MUC: airport("MUC", "Munich Airport", "Munich", "Germany", "DE", "EUR", "DACH", 48.3538, 11.7861),
  RUH: airport("RUH", "King Khalid International Airport", "Riyadh", "Saudi Arabia", "SA", "SAR", "Middle East", 24.9576, 46.6988),
  SIN: airport("SIN", "Singapore Changi Airport", "Singapore", "Singapore", "SG", "SGD", "Southeast Asia", 1.3644, 103.9915),
  SZX: airport("SZX", "Shenzhen Bao'an International Airport", "Shenzhen", "China", "CN", "CNY", "Greater China", 22.6393, 113.8107),
  VIE: airport("VIE", "Vienna International Airport", "Vienna", "Austria", "AT", "EUR", "DACH", 48.1103, 16.5697),
  ZRH: airport("ZRH", "Zurich Airport", "Zurich", "Switzerland", "CH", "CHF", "DACH", 47.4581, 8.5555),
};

export async function getAirlineOperationalPerformanceDashboard(
  session: SessionPayload,
): Promise<AirlineOperationalPerformanceDashboard> {
  const [contracts, quotes, bookings, monthlyReports, contractPerformance] = await Promise.all([
    listLivePartnerContracts(),
    listMandateQuotes(session),
    listMandateBookings(session),
    listMonthlyReports(session),
    listContractPerformance(session),
  ]);
  const visibleContracts = contracts.filter((contract) => canViewContract(session, contract));
  const visibleContractIds = new Set(visibleContracts.map((contract) => contract.id));
  const visibleQuotes = quotes.filter((quote) => visibleContractIds.has(quote.contractId));
  const visibleBookings = bookings.filter((booking) => visibleContractIds.has(booking.contractId));

  return {
    kpiData: buildKpiSeries(visibleBookings),
    countries: buildCountryPerformance(visibleContracts, visibleBookings),
    gsas: buildGsaPerformance(visibleContracts, visibleBookings),
    selectedAverage: buildSelectedAverage(visibleBookings, visibleContracts),
    watchlist: buildWatchlist(visibleContracts, visibleQuotes, contractPerformance, monthlyReports),
  };
}

function buildCountryPerformance(contracts: LivePartnerContract[], bookings: MandateBooking[]): CountryPerformance[] {
  const countries = new Map<string, CountryAggregate>();

  for (const contract of contracts) {
    for (const route of contract.contractRoutes.filter((item) => item.status === "assigned")) {
      touchCountryRoute(countries, route, contract);
    }
  }

  for (const booking of bookings.filter((item) => item.status !== "cancelled")) {
    const route = getBookingRoute(booking);
    const meta = airportMeta(booking.destination);
    const country = getOrCreateCountry(countries, meta);
    const airport = getOrCreateAirport(country, meta);
    const routeAggregate = getOrCreateRoute(airport, route, booking.origin, booking.destination);
    const revenue = booking.finalRevenueAmount ?? booking.bookedRevenueAmount ?? booking.revenueAmount;
    const weightKg = booking.flownWeightKg ?? booking.bookedWeightKg ?? booking.weightKg;
    const loadFactor = estimateBookingLoadFactor(booking, contracts.find((contract) => contract.id === booking.contractId));

    addTraffic(country, airport, routeAggregate, revenue, weightKg, booking.flightNumber ?? booking.id, loadFactor);
  }

  return Array.from(countries.values())
    .map(toCountryPerformance)
    .sort((left, right) => right.revenue - left.revenue || left.country.localeCompare(right.country));
}

function buildGsaPerformance(contracts: LivePartnerContract[], bookings: MandateBooking[]): GsaPerformance[] {
  const gsas = new Map<string, GsaAggregate>();

  for (const contract of contracts) {
    const gsa = getOrCreateGsa(gsas, contract);
    if (contract.market) gsa.assignedMarkets.add(contract.market);
  }

  for (const booking of bookings.filter((item) => item.status !== "cancelled")) {
    const contract = contracts.find((item) => item.id === booking.contractId);
    const gsa = contract ? getOrCreateGsa(gsas, contract) : getOrCreateGsaFromBooking(gsas, booking);
    const revenue = booking.finalRevenueAmount ?? booking.bookedRevenueAmount ?? booking.revenueAmount;
    const weightKg = booking.flownWeightKg ?? booking.bookedWeightKg ?? booking.weightKg;
    const loadFactor = estimateBookingLoadFactor(booking, contract);
    gsa.revenue += revenue;
    gsa.weightKg += weightKg;
    gsa.flightCount += 1;
    gsa.loadFactorSum += loadFactor;
    gsa.loadFactorCount += 1;
  }

  return Array.from(gsas.values())
    .map((gsa) => ({
      gsaName: gsa.gsaName,
      assignedMarkets: Array.from(gsa.assignedMarkets).join(", ") || "Assigned contract markets",
      revenue: roundMoney(gsa.revenue),
      yieldPerKg: yieldPerKg(gsa.revenue, gsa.weightKg),
      loadFactor: averageLoadFactor(gsa.loadFactorSum, gsa.loadFactorCount),
      tonnage: kgToTons(gsa.weightKg),
      flightCount: gsa.flightCount,
    }))
    .sort((left, right) => right.revenue - left.revenue || left.gsaName.localeCompare(right.gsaName));
}

function buildKpiSeries(bookings: MandateBooking[]): KpiPoint[] {
  const byMonth = new Map<string, { revenue: number; weightKg: number; loadFactorSum: number; loadFactorCount: number }>();

  for (const booking of bookings.filter((item) => item.status !== "cancelled")) {
    const month = (booking.flightDate || booking.createdAt).slice(0, 7);
    const current = byMonth.get(month) ?? { revenue: 0, weightKg: 0, loadFactorSum: 0, loadFactorCount: 0 };
    const weightKg = booking.flownWeightKg ?? booking.bookedWeightKg ?? booking.weightKg;
    current.revenue += booking.finalRevenueAmount ?? booking.bookedRevenueAmount ?? booking.revenueAmount;
    current.weightKg += weightKg;
    current.loadFactorSum += estimateBookingLoadFactor(booking);
    current.loadFactorCount += 1;
    byMonth.set(month, current);
  }

  return Array.from(byMonth.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      month: formatMonth(date),
      revenue: roundMoney(value.revenue),
      loadfactor: averageLoadFactor(value.loadFactorSum, value.loadFactorCount),
      yield: yieldPerKg(value.revenue, value.weightKg),
    }));
}

function buildSelectedAverage(bookings: MandateBooking[], contracts: LivePartnerContract[]): PeriodAveragePerformance {
  const activeBookings = bookings.filter((item) => item.status !== "cancelled");
  const revenue = activeBookings.reduce((sum, booking) => sum + (booking.finalRevenueAmount ?? booking.bookedRevenueAmount ?? booking.revenueAmount), 0);
  const weightKg = activeBookings.reduce((sum, booking) => sum + (booking.flownWeightKg ?? booking.bookedWeightKg ?? booking.weightKg), 0);
  const loadFactors = activeBookings.map((booking) =>
    estimateBookingLoadFactor(booking, contracts.find((contract) => contract.id === booking.contractId)),
  );
  return {
    period: "monthly",
    label: "All recorded operations",
    revenue: roundMoney(revenue),
    yieldPerKg: yieldPerKg(revenue, weightKg),
    loadFactor: averageLoadFactor(loadFactors.reduce((sum, value) => sum + value, 0), loadFactors.length),
    tonnage: kgToTons(weightKg),
    flightCount: activeBookings.length,
  };
}

function buildWatchlist(
  contracts: LivePartnerContract[],
  quotes: MandateQuote[],
  performance: Awaited<ReturnType<typeof listContractPerformance>>,
  monthlyReports: Awaited<ReturnType<typeof listMonthlyReports>>,
) {
  const items = new Set<string>();

  for (const snapshot of performance) {
    for (const reason of snapshot.riskReasons.slice(0, 2)) {
      items.add(`${snapshot.gsaName}: ${reason}`);
    }
    for (const route of snapshot.routePerformance.filter((item) => item.assigned && item.riskLevel !== "green").slice(0, 2)) {
      items.add(`${route.origin}-${route.destination}: ${route.riskLevel === "red" ? "quote activity has no bookings" : "no commercial activity this month"}`);
    }
  }

  const pendingApprovalCount = quotes.filter((quote) => quote.status === "airline-approval-required").length;
  if (pendingApprovalCount > 0) items.add(`${pendingApprovalCount} quote${pendingApprovalCount === 1 ? "" : "s"} awaiting airline approval`);

  const submittedReports = monthlyReports.filter((report) => report.status === "submitted");
  if (submittedReports.length > 0) items.add(`${submittedReports.length} monthly report${submittedReports.length === 1 ? "" : "s"} waiting for airline review`);

  const activeContractsWithoutRoutes = contracts.filter(
    (contract) => contract.status === "active" && !contract.contractRoutes.some((route) => route.status === "assigned"),
  );
  for (const contract of activeContractsWithoutRoutes.slice(0, 3)) {
    items.add(`${contract.gsaName}: active contract has no assigned routes`);
  }

  return Array.from(items).slice(0, 9);
}

function touchCountryRoute(countries: Map<string, CountryAggregate>, route: LiveContractRoute, contract: LivePartnerContract) {
  const meta = airportMeta(route.destination);
  const country = getOrCreateCountry(countries, meta);
  const airport = getOrCreateAirport(country, meta);
  const routeAggregate = getOrCreateRoute(airport, `${route.origin}-${route.destination}`, route.origin, route.destination);
  routeAggregate.loadFactorSum += contract.targetLoadFactor ?? 0;
  routeAggregate.loadFactorCount += contract.targetLoadFactor ? 1 : 0;
}

function toCountryPerformance(country: CountryAggregate): CountryPerformance {
  const airports = Array.from(country.airports.values())
    .map((airport) => {
      const routes = Array.from(airport.routes.values())
        .map((route): RouteBreakdown => ({
          route: route.route,
          destination: route.destination,
          revenue: roundMoney(route.revenue),
          tonnage: kgToTons(route.weightKg),
          loadFactor: averageLoadFactor(route.loadFactorSum, route.loadFactorCount),
          yieldPerKg: yieldPerKg(route.revenue, route.weightKg),
          flightCount: route.flightCount,
        }))
        .sort((left, right) => right.revenue - left.revenue || left.route.localeCompare(right.route));

      return {
        airportCode: airport.airportCode,
        airportName: airport.airportName,
        city: airport.city,
        revenue: roundMoney(airport.revenue),
        tonnage: kgToTons(airport.weightKg),
        loadFactor: averageLoadFactor(
          routes.reduce((sum, route) => sum + route.loadFactor, 0),
          routes.filter((route) => route.loadFactor > 0).length,
        ),
        yieldPerKg: yieldPerKg(airport.revenue, airport.weightKg),
        flightCount: airport.flightCount,
        topRoute: routes[0]?.route ?? "No assigned route activity",
        routes,
      };
    })
    .sort((left, right) => right.revenue - left.revenue || left.airportCode.localeCompare(right.airportCode));

  return {
    country: country.meta.country,
    code: country.meta.countryCode,
    localCurrencyCode: country.meta.localCurrencyCode,
    region: country.meta.region,
    revenue: roundMoney(country.revenue),
    yieldPerKg: yieldPerKg(country.revenue, country.weightKg),
    loadFactor: averageLoadFactor(country.loadFactorSum, country.loadFactorCount),
    tonnage: kgToTons(country.weightKg),
    topLane: airports[0]?.topRoute ?? "No assigned route activity",
    airports,
    mapCenter: { lat: country.meta.lat, lng: country.meta.lng },
    mapFootprint: footprint(country.meta.lat, country.meta.lng),
  };
}

function getOrCreateCountry(countries: Map<string, CountryAggregate>, meta: AirportMeta) {
  const existing = countries.get(meta.country);
  if (existing) return existing;
  const country: CountryAggregate = {
    meta,
    revenue: 0,
    weightKg: 0,
    flightCount: 0,
    loadFactorSum: 0,
    loadFactorCount: 0,
    airports: new Map(),
  };
  countries.set(meta.country, country);
  return country;
}

function getOrCreateAirport(country: CountryAggregate, meta: AirportMeta) {
  const existing = country.airports.get(meta.airportCode);
  if (existing) return existing;
  const airport: AirportAggregate = {
    ...meta,
    revenue: 0,
    weightKg: 0,
    flightCount: 0,
    routes: new Map(),
  };
  country.airports.set(meta.airportCode, airport);
  return airport;
}

function getOrCreateRoute(airport: AirportAggregate, route: string, origin: string, destination: string) {
  const existing = airport.routes.get(route);
  if (existing) return existing;
  const aggregate: RouteAggregate = {
    route,
    origin,
    destination,
    revenue: 0,
    weightKg: 0,
    flightCount: 0,
    loadFactorSum: 0,
    loadFactorCount: 0,
  };
  airport.routes.set(route, aggregate);
  return aggregate;
}

function getOrCreateGsa(gsas: Map<string, GsaAggregate>, contract: LivePartnerContract) {
  const key = contract.gsaCompanyId ?? contract.gsaId ?? contract.gsaName;
  const existing = gsas.get(key);
  if (existing) return existing;
  const gsa: GsaAggregate = {
    gsaName: contract.gsaName,
    assignedMarkets: new Set(contract.market ? [contract.market] : []),
    revenue: 0,
    weightKg: 0,
    flightCount: 0,
    loadFactorSum: 0,
    loadFactorCount: 0,
  };
  gsas.set(key, gsa);
  return gsa;
}

function getOrCreateGsaFromBooking(gsas: Map<string, GsaAggregate>, booking: MandateBooking) {
  const key = booking.gsaCompanyId ?? booking.gsaId ?? booking.gsaName;
  const existing = gsas.get(key);
  if (existing) return existing;
  const gsa: GsaAggregate = {
    gsaName: booking.gsaName,
    assignedMarkets: new Set([`${booking.origin}-${booking.destination}`]),
    revenue: 0,
    weightKg: 0,
    flightCount: 0,
    loadFactorSum: 0,
    loadFactorCount: 0,
  };
  gsas.set(key, gsa);
  return gsa;
}

function addTraffic(
  country: CountryAggregate,
  airport: AirportAggregate,
  route: RouteAggregate,
  revenue: number,
  weightKg: number,
  flightKey: string,
  loadFactor: number,
) {
  const normalizedRevenue = Number.isFinite(revenue) ? revenue : 0;
  const normalizedWeightKg = Number.isFinite(weightKg) ? weightKg : 0;
  country.revenue += normalizedRevenue;
  country.weightKg += normalizedWeightKg;
  country.flightCount += 1;
  country.loadFactorSum += loadFactor;
  country.loadFactorCount += 1;
  airport.revenue += normalizedRevenue;
  airport.weightKg += normalizedWeightKg;
  airport.flightCount += 1;
  route.revenue += normalizedRevenue;
  route.weightKg += normalizedWeightKg;
  route.flightCount += flightKey ? 1 : 1;
  route.loadFactorSum += loadFactor;
  route.loadFactorCount += 1;
}

function estimateBookingLoadFactor(booking: MandateBooking, contract?: LivePartnerContract) {
  if (contract?.targetLoadFactor) return contract.targetLoadFactor;
  const targetKg = contract?.monthlyTonnageTargetKg;
  if (targetKg && targetKg > 0) {
    const weightKg = booking.flownWeightKg ?? booking.bookedWeightKg ?? booking.weightKg;
    return Math.max(1, Math.min(100, Math.round((weightKg / targetKg) * 100)));
  }
  return booking.status === "flown" ? 100 : booking.status === "booked" ? 80 : 0;
}

function getBookingRoute(booking: Pick<MandateBooking, "origin" | "destination">) {
  return `${booking.origin}-${booking.destination}`;
}

function airportMeta(code: string): AirportMeta {
  const airportCode = code.trim().toUpperCase();
  return AIRPORTS[airportCode] ?? airport(airportCode, `${airportCode} Airport`, airportCode, "Unmapped airport", "XX", "EUR", "Unmapped", 0, 0);
}

function airport(
  airportCode: string,
  airportName: string,
  city: string,
  country: string,
  countryCode: string,
  localCurrencyCode: string,
  region: string,
  lat: number,
  lng: number,
): AirportMeta {
  return { airportCode, airportName, city, country, countryCode, localCurrencyCode, region, lat, lng };
}

function footprint(lat: number, lng: number): [number, number][] {
  return [
    [lat + 1.2, lng - 1.6],
    [lat + 1.2, lng + 1.6],
    [lat - 1.2, lng + 1.6],
    [lat - 1.2, lng - 1.6],
  ];
}

function formatMonth(date: string) {
  const [year, month] = date.split("-");
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(parsed);
}

function yieldPerKg(revenue: number, weightKg: number) {
  return weightKg > 0 ? roundMoney(revenue / weightKg) : 0;
}

function kgToTons(weightKg: number) {
  return Math.round((weightKg / 1000) * 10) / 10;
}

function averageLoadFactor(sum: number, count: number) {
  return count > 0 ? Math.round(sum / count) : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
