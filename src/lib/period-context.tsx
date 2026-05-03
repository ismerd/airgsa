"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  countryPerformanceByPeriod,
  gsaPerformanceByPeriod,
  periodAveragePerformance,
  scaleCountryByFactor,
  scaleGsaByFactor,
  type CountryPerformance,
  type GsaPerformance,
  type PeriodAveragePerformance,
  type PerformancePeriod,
} from "./airline-performance-data";

export type PeriodTab = PerformancePeriod | "custom";

type PeriodContextValue = {
  selectedPeriod: PeriodTab;
  setSelectedPeriod: (p: PeriodTab) => void;
  customStart: string;
  setCustomStart: (v: string) => void;
  customEnd: string;
  setCustomEnd: (v: string) => void;
  countries: CountryPerformance[];
  gsas: GsaPerformance[];
  selectedAverage: Omit<PeriodAveragePerformance, "period">;
};

const PeriodContext = createContext<PeriodContextValue>({
  selectedPeriod: "monthly",
  setSelectedPeriod: () => {},
  customStart: "2026-01-01",
  setCustomStart: () => {},
  customEnd: "2026-04-30",
  setCustomEnd: () => {},
  countries: countryPerformanceByPeriod.monthly,
  gsas: gsaPerformanceByPeriod.monthly,
  selectedAverage: periodAveragePerformance.find((p) => p.period === "monthly")!,
});

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodTab>("monthly");
  const [customStart, setCustomStart] = useState("2026-01-01");
  const [customEnd, setCustomEnd] = useState("2026-04-30");

  const customDays = useMemo(
    () => Math.max(1, Math.round((new Date(customEnd).getTime() - new Date(customStart).getTime()) / 86400000) + 1),
    [customStart, customEnd],
  );

  const customCountries = useMemo(
    () => (selectedPeriod === "custom" ? scaleCountryByFactor(customDays / 30) : []),
    [selectedPeriod, customDays],
  );

  const customGsas = useMemo(
    () => (selectedPeriod === "custom" ? scaleGsaByFactor(customDays / 30) : []),
    [selectedPeriod, customDays],
  );

  const customAverage = useMemo((): Omit<PeriodAveragePerformance, "period"> => {
    const revenue = customCountries.reduce((s, r) => s + r.revenue, 0);
    const tonnage = customCountries.reduce((s, r) => s + r.tonnage, 0);
    const loadFactor = customCountries.length
      ? Math.round(customCountries.reduce((s, r) => s + r.loadFactor, 0) / customCountries.length)
      : 0;
    return {
      label: "Custom range",
      revenue,
      yieldPerKg: tonnage === 0 ? 0 : revenue / (tonnage * 1000),
      loadFactor,
      tonnage,
      flightCount: customGsas.reduce((s, r) => s + r.flightCount, 0),
    };
  }, [customCountries, customGsas]);

  const countries = selectedPeriod === "custom" ? customCountries : countryPerformanceByPeriod[selectedPeriod];
  const gsas = selectedPeriod === "custom" ? customGsas : gsaPerformanceByPeriod[selectedPeriod];
  const selectedAverage =
    selectedPeriod === "custom"
      ? customAverage
      : periodAveragePerformance.find((p) => p.period === selectedPeriod)!;

  return (
    <PeriodContext.Provider
      value={{ selectedPeriod, setSelectedPeriod, customStart, setCustomStart, customEnd, setCustomEnd, countries, gsas, selectedAverage }}
    >
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  return useContext(PeriodContext);
}
