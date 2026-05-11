"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CURRENCIES, useCurrency } from "@/lib/currency-context";
import { usePeriod, type DashboardMode } from "@/lib/period-context";
import { cn } from "@/lib/utils";

const PRIMARY_CURRENCIES = ["USD", "EUR", "AED", "SGD", "CHF"];
const MORE_CURRENCIES = CURRENCIES.filter((c) => !PRIMARY_CURRENCIES.includes(c.code));

const MODES: { id: DashboardMode; label: string }[] = [
  { id: "ytd",     label: "YTD"     },
  { id: "fy",      label: "FY"      },
  { id: "daily",   label: "Daily"   },
  { id: "weekly",  label: "Weekly"  },
  { id: "monthly", label: "Monthly" },
  { id: "yearly",  label: "Yearly"  },
  { id: "custom",  label: "Custom"  },
];

export function TimeRangeFilter() {
  const { dashboardMode, setDashboardMode, kpiCustomStart, setKpiCustomStart, kpiCustomEnd, setKpiCustomEnd } = usePeriod();
  const { currency, setCurrencyCode } = useCurrency();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Currency — left */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Currency</span>
        <div className="flex overflow-hidden rounded-md border border-border-ui bg-surface2 p-0.5">
          {PRIMARY_CURRENCIES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setCurrencyCode(code)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                currency.code === code ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
              )}
            >
              {code}
            </button>
          ))}
        </div>

        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1 rounded-md border border-border-ui bg-surface2 px-2.5 py-1.5 text-xs font-medium transition-colors hover:text-ink",
              MORE_CURRENCIES.some((c) => c.code === currency.code)
                ? "border-brand/60 bg-brand/10 text-ink"
                : "text-ink-muted",
            )}
          >
            {MORE_CURRENCIES.some((c) => c.code === currency.code) ? currency.code : "More"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", moreOpen && "rotate-180")} />
          </button>

          {moreOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[110px] rounded-lg border border-border-ui bg-surface shadow-xl">
              {MORE_CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { setCurrencyCode(c.code); setMoreOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-xs transition-colors hover:bg-surface2",
                    c.code === currency.code ? "font-semibold text-brand" : "text-ink-muted",
                  )}
                >
                  <span className="font-medium text-ink">{c.code}</span>
                  <span className="text-ink-muted">{c.symbol}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unified period filter — right */}
      <div className="flex items-center gap-1.5">
        <div className="flex overflow-x-auto rounded-md border border-border-ui bg-surface2 p-0.5 scrollbar-none">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setDashboardMode(m.id)}
              className={cn(
                "whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition-colors",
                dashboardMode === m.id ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Custom month pickers — slide in when custom selected */}
        <div
          className={cn(
            "flex items-center gap-1.5 overflow-hidden transition-all duration-200 ease-in-out",
            dashboardMode === "custom" ? "max-w-xs opacity-100" : "max-w-0 opacity-0 pointer-events-none",
          )}
        >
          <input
            type="month"
            value={kpiCustomStart}
            max={kpiCustomEnd}
            onChange={(e) => setKpiCustomStart(e.target.value)}
            className="h-8 rounded-md border border-border-ui bg-surface2 px-2 text-xs text-ink outline-none focus:border-brand"
          />
          <span className="text-xs text-ink-muted">–</span>
          <input
            type="month"
            value={kpiCustomEnd}
            min={kpiCustomStart}
            onChange={(e) => setKpiCustomEnd(e.target.value)}
            className="h-8 rounded-md border border-border-ui bg-surface2 px-2 text-xs text-ink outline-none focus:border-brand"
          />
        </div>
      </div>
    </div>
  );
}
