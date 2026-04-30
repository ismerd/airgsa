export type CountryPerformance = {
  country: string;
  region: string;
  revenue: number;
  yieldPerKg: number;
  loadFactor: number;
  tonnage: number;
  topLane: string;
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

const monthlyCountryPerformance: CountryPerformance[] = [
  {
    country: "Germany",
    region: "DACH",
    revenue: 482000,
    yieldPerKg: 2.68,
    loadFactor: 84,
    tonnage: 179.8,
    topLane: "FRA-DXB",
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
    region: "DACH",
    revenue: 218500,
    yieldPerKg: 2.41,
    loadFactor: 76,
    tonnage: 90.7,
    topLane: "VIE-DOH",
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
    region: "DACH",
    revenue: 191200,
    yieldPerKg: 2.93,
    loadFactor: 81,
    tonnage: 65.3,
    topLane: "ZRH-SIN",
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
    region: "Middle East",
    revenue: 264700,
    yieldPerKg: 2.52,
    loadFactor: 79,
    tonnage: 105.1,
    topLane: "DXB-FRA",
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
    region: "Asia",
    revenue: 236400,
    yieldPerKg: 3.18,
    loadFactor: 88,
    tonnage: 74.3,
    topLane: "SIN-MUC",
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
    region: "Iberia",
    revenue: 143800,
    yieldPerKg: 2.22,
    loadFactor: 69,
    tonnage: 64.8,
    topLane: "BCN-MEX",
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
  {
    gsaName: "BlueWing Cargo Solutions",
    assignedMarkets: "Germany, Austria, Switzerland",
    revenue: 658400,
    yieldPerKg: 2.74,
    loadFactor: 83,
    tonnage: 240.2,
    flightCount: 42,
  },
  {
    gsaName: "Atlantic AirCargo Partners",
    assignedMarkets: "Spain, Portugal, France",
    revenue: 286900,
    yieldPerKg: 2.31,
    loadFactor: 71,
    tonnage: 124.1,
    flightCount: 27,
  },
  {
    gsaName: "NordicLift Aviation Services",
    assignedMarkets: "Nordics, Baltics",
    revenue: 352600,
    yieldPerKg: 2.96,
    loadFactor: 80,
    tonnage: 119.1,
    flightCount: 31,
  },
  {
    gsaName: "Direct airline sales",
    assignedMarkets: "Key accounts and strategic lanes",
    revenue: 412500,
    yieldPerKg: 2.85,
    loadFactor: 86,
    tonnage: 144.7,
    flightCount: 35,
  },
];

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

function scaleCountryPerformance(row: CountryPerformance, period: PerformancePeriod): CountryPerformance {
  const config = periodConfigs[period];

  return {
    ...row,
    revenue: Math.round(row.revenue * config.factor),
    yieldPerKg: roundToTwo(row.yieldPerKg + config.yieldDelta),
    loadFactor: clampLoadFactor(row.loadFactor + config.loadFactorDelta),
    tonnage: roundToOne(row.tonnage * config.factor),
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
