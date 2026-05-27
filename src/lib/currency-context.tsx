"use client";

import { createContext, useContext, useState } from "react";

type CurrencyConfig = {
  code: string;
  symbol: string;
  rate: number;
};

const CURRENCIES: CurrencyConfig[] = [
  { code: "USD", symbol: "$", rate: 1 },
  { code: "EUR", symbol: "€", rate: 0.93 },
  { code: "GBP", symbol: "£", rate: 0.80 },
  { code: "AED", symbol: "د.إ", rate: 3.67 },
  { code: "CHF", symbol: "Fr", rate: 0.90 },
  { code: "SGD", symbol: "S$", rate: 1.35 },
  { code: "JPY", symbol: "¥", rate: 155 },
  { code: "CAD", symbol: "C$", rate: 1.36 },
  { code: "AUD", symbol: "A$", rate: 1.55 },
  { code: "HKD", symbol: "HK$", rate: 7.78 },
  { code: "CNY", symbol: "¥", rate: 7.24 },
];

type CurrencyContextValue = {
  currency: CurrencyConfig;
  setCurrencyCode: (code: string) => void;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: CURRENCIES[0],
  setCurrencyCode: () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState("USD");
  const currency = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode: setCode }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function formatMoney(value: number, symbol: string, rate: number): string {
  const v = Math.round(value * rate);
  return `${symbol}${v.toLocaleString("en-US")}`;
}
