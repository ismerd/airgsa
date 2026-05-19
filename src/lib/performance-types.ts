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
  code: string;
  localCurrencyCode: string;
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
