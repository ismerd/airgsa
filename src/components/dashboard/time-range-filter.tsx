"use client";

import { performancePeriodOptions } from "@/lib/airline-performance-data";
import { usePeriod, type PeriodTab } from "@/lib/period-context";
import { cn } from "@/lib/utils";

export function TimeRangeFilter() {
  const { selectedPeriod, setSelectedPeriod, customStart, setCustomStart, customEnd, setCustomEnd } = usePeriod();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* Period pills — horizontally scrollable on mobile */}
      <div className="flex overflow-x-auto rounded-md border border-border-ui bg-surface2 p-0.5 scrollbar-none">
        {performancePeriodOptions.map((p) => (
          <PeriodButton
            key={p.id}
            label={p.label}
            active={selectedPeriod === p.id}
            onClick={() => setSelectedPeriod(p.id)}
          />
        ))}
        <PeriodButton
          label="Custom"
          active={selectedPeriod === "custom"}
          onClick={() => setSelectedPeriod("custom")}
        />
      </div>

      {/* Custom date pickers */}
      {selectedPeriod === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customStart}
            max={customEnd}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-8 rounded-md border border-border-ui bg-surface2 px-2 text-xs text-ink outline-none focus:border-brand"
          />
          <span className="text-xs text-ink-muted">–</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-8 rounded-md border border-border-ui bg-surface2 px-2 text-xs text-ink outline-none focus:border-brand"
          />
        </div>
      )}
    </div>
  );
}

function PeriodButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
