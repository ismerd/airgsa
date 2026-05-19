"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  type CountryPerformance,
  type GsaPerformance,
  type PeriodAveragePerformance,
  type PerformancePeriod,
} from "./performance-types";

export type DashboardMode = "ytd" | "fy" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type KpiPeriod = "ytd" | "fy" | "custom";

// What each mode means internally
const MODE_MAP: Record<DashboardMode, { kpiPeriod: KpiPeriod; performancePeriod: PerformancePeriod }> = {
  ytd:     { kpiPeriod: "ytd",    performancePeriod: "monthly" },
  fy:      { kpiPeriod: "fy",     performancePeriod: "monthly" },
  daily:   { kpiPeriod: "fy",     performancePeriod: "daily"   },
  weekly:  { kpiPeriod: "fy",     performancePeriod: "weekly"  },
  monthly: { kpiPeriod: "ytd",    performancePeriod: "monthly" },
  yearly:  { kpiPeriod: "fy",     performancePeriod: "yearly"  },
  custom:  { kpiPeriod: "custom", performancePeriod: "monthly" },
};

type PeriodContextValue = {
  dashboardMode: DashboardMode;
  setDashboardMode: (m: DashboardMode) => void;
  kpiPeriod: KpiPeriod;
  kpiCustomStart: string;
  setKpiCustomStart: (v: string) => void;
  kpiCustomEnd: string;
  setKpiCustomEnd: (v: string) => void;
  countries: CountryPerformance[];
  gsas: GsaPerformance[];
  selectedAverage: Omit<PeriodAveragePerformance, "period">;
};

const defaultAverage: PeriodAveragePerformance = {
  period: "monthly",
  label: "Monthly",
  revenue: 0,
  yieldPerKg: 0,
  loadFactor: 0,
  tonnage: 0,
  flightCount: 0,
};

const averageByPeriod: Record<PerformancePeriod, PeriodAveragePerformance> = {
  daily: { ...defaultAverage, period: "daily", label: "Daily" },
  weekly: { ...defaultAverage, period: "weekly", label: "Weekly" },
  monthly: defaultAverage,
  yearly: { ...defaultAverage, period: "yearly", label: "Yearly" },
};

const PeriodContext = createContext<PeriodContextValue>({
  dashboardMode: "fy",
  setDashboardMode: () => {},
  kpiPeriod: "fy",
  kpiCustomStart: "2026-01",
  setKpiCustomStart: () => {},
  kpiCustomEnd: "2026-04",
  setKpiCustomEnd: () => {},
  countries: [],
  gsas: [],
  selectedAverage: defaultAverage,
});

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>("fy");
  const [kpiCustomStart, setKpiCustomStart] = useState("2026-01");
  const [kpiCustomEnd, setKpiCustomEnd] = useState("2026-04");

  const { kpiPeriod, performancePeriod } = MODE_MAP[dashboardMode];

  const countries = useMemo<CountryPerformance[]>(() => [], []);
  const gsas = useMemo<GsaPerformance[]>(() => [], []);
  const selectedAverage = useMemo(
    () => averageByPeriod[performancePeriod],
    [performancePeriod],
  );

  return (
    <PeriodContext.Provider
      value={{ dashboardMode, setDashboardMode, kpiPeriod, kpiCustomStart, setKpiCustomStart, kpiCustomEnd, setKpiCustomEnd, countries, gsas, selectedAverage }}
    >
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  return useContext(PeriodContext);
}
