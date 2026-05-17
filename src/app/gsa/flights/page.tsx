"use client";

import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plane,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FlightStatus = "open" | "nearly-full" | "full" | "closed";

type Flight = {
  id: string;
  flightNo: string;
  origin: string;
  via?: string;
  destination: string;
  departure: string;
  arrivalLocal: string;
  aircraft: string;
  totalCapacity: number;
  bookedKg: number;
  pieces: number;
  status: FlightStatus;
};

const ALL_FLIGHTS: Flight[] = [
  { id: "f-01", flightNo: "SV264", origin: "MAD", destination: "DXB", departure: "2026-05-18T06:30", arrivalLocal: "2026-05-18T18:45", aircraft: "B777F", totalCapacity: 24000, bookedKg: 9800, pieces: 42, status: "open" },
  { id: "f-02", flightNo: "SV180", origin: "MAD", destination: "RUH", departure: "2026-05-18T14:00", arrivalLocal: "2026-05-18T23:10", aircraft: "A330F", totalCapacity: 18000, bookedKg: 15800, pieces: 61, status: "nearly-full" },
  { id: "f-03", flightNo: "SV170", origin: "MAD", via: "RUH", destination: "JED", departure: "2026-05-19T08:15", arrivalLocal: "2026-05-19T22:00", aircraft: "B777F", totalCapacity: 24000, bookedKg: 12400, pieces: 55, status: "open" },
  { id: "f-04", flightNo: "SV820", origin: "MAD", destination: "CPT", departure: "2026-05-19T22:00", arrivalLocal: "2026-05-20T09:30", aircraft: "A330F", totalCapacity: 18000, bookedKg: 4200, pieces: 18, status: "open" },
  { id: "f-05", flightNo: "SV266", origin: "MAD", destination: "DXB", departure: "2026-05-20T06:30", arrivalLocal: "2026-05-20T18:45", aircraft: "B777F", totalCapacity: 24000, bookedKg: 23100, pieces: 98, status: "nearly-full" },
  { id: "f-06", flightNo: "SV182", origin: "MAD", via: "RUH", destination: "JED", departure: "2026-05-21T09:00", arrivalLocal: "2026-05-21T22:30", aircraft: "B777F", totalCapacity: 24000, bookedKg: 24000, pieces: 104, status: "full" },
  { id: "f-07", flightNo: "SV818", origin: "MAD", destination: "CPT", departure: "2026-05-22T21:00", arrivalLocal: "2026-05-23T08:20", aircraft: "A330F", totalCapacity: 18000, bookedKg: 6100, pieces: 24, status: "open" },
  { id: "f-08", flightNo: "SV264", origin: "MAD", destination: "DXB", departure: "2026-05-25T06:30", arrivalLocal: "2026-05-25T18:45", aircraft: "B777F", totalCapacity: 24000, bookedKg: 3200, pieces: 14, status: "open" },
  { id: "f-09", flightNo: "SV170", origin: "MAD", via: "RUH", destination: "JED", departure: "2026-05-26T08:15", arrivalLocal: "2026-05-26T22:00", aircraft: "B777F", totalCapacity: 24000, bookedKg: 7600, pieces: 31, status: "open" },
  { id: "f-10", flightNo: "SV180", origin: "MAD", destination: "RUH", departure: "2026-05-26T14:00", arrivalLocal: "2026-05-26T23:10", aircraft: "A330F", totalCapacity: 18000, bookedKg: 11200, pieces: 45, status: "open" },
  { id: "f-11", flightNo: "SV820", origin: "MAD", destination: "CPT", departure: "2026-05-27T22:00", arrivalLocal: "2026-05-28T09:30", aircraft: "A330F", totalCapacity: 18000, bookedKg: 2100, pieces: 9, status: "open" },
  { id: "f-12", flightNo: "SV266", origin: "MAD", destination: "DXB", departure: "2026-05-28T06:30", arrivalLocal: "2026-05-28T18:45", aircraft: "B777F", totalCapacity: 24000, bookedKg: 16800, pieces: 72, status: "nearly-full" },
];

const STATUS_CONFIG: Record<FlightStatus, { label: string; variant: "success" | "warning" | "danger" | "muted"; barColor: string }> = {
  "open":        { label: "Open",        variant: "success", barColor: "bg-success" },
  "nearly-full": { label: "Nearly Full", variant: "warning", barColor: "bg-warning" },
  "full":        { label: "Full",        variant: "danger",  barColor: "bg-danger" },
  "closed":      { label: "Closed",      variant: "muted",   barColor: "bg-ink-muted" },
};

const WEEKS = [
  { label: "This week", offset: 0, dates: ["May 17", "18", "19", "20", "21", "22", "23"] },
  { label: "Next week", offset: 1, dates: ["May 24", "25", "26", "27", "28", "29", "30"] },
  { label: "Week 3", offset: 2, dates: ["Jun 1", "2", "3", "4", "5", "6", "7"] },
];

type Toast = { message: string };

export default function FlightsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [fblDone, setFblDone] = useState<Record<string, boolean>>({});

  const week = WEEKS[weekOffset] ?? WEEKS[0];

  function showToast(message: string) {
    setToast({ message });
    setTimeout(() => setToast(null), 4000);
  }

  function handleFbl(f: Flight) {
    setFblDone((d) => ({ ...d, [f.id]: true }));
    showToast(`FBL generated for ${f.flightNo} · ${formatDate(f.departure)}`);
  }

  const visibleFlights = ALL_FLIGHTS.filter((f) => {
    const depDate = new Date(f.departure);
    const baseDate = new Date("2026-05-17");
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + 7);
    return depDate >= baseDate && depDate < endDate;
  });

  const totalCap = visibleFlights.reduce((s, f) => s + f.totalCapacity, 0);
  const totalBooked = visibleFlights.reduce((s, f) => s + f.bookedKg, 0);
  const totalAvail = totalCap - totalBooked;
  const utilPct = totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0;

  return (
    <>
      <Topbar title="Flight Schedule" subtitle="Capacity & route overview" />
      <main className="space-y-5 p-5">

        {/* Week selector + stats */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setWeekOffset((w) => Math.max(0, w - 1))} disabled={weekOffset === 0} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-ui bg-surface text-ink-muted transition-colors hover:bg-surface2 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-border-ui bg-surface px-4 py-2">
              <Calendar className="h-4 w-4 text-brand" />
              <span className="text-sm font-bold text-ink">{week.label}</span>
              <span className="text-xs text-ink-muted">{week.dates[0]} – {week.dates[6]}</span>
            </div>
            <button type="button" onClick={() => setWeekOffset((w) => Math.min(WEEKS.length - 1, w + 1))} disabled={weekOffset === WEEKS.length - 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-ui bg-surface text-ink-muted transition-colors hover:bg-surface2 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MiniStat label="Flights" value={String(visibleFlights.length)} />
            <MiniStat label="Total Cap" value={`${(totalCap / 1000).toFixed(0)}t`} />
            <MiniStat label="Booked" value={`${(totalBooked / 1000).toFixed(0)}t`} sub={`${utilPct}%`} accent="brand" />
            <MiniStat label="Available" value={`${(totalAvail / 1000).toFixed(0)}t`} accent={totalAvail < 10000 ? "warning" : "success"} />
            <MiniStat label="FAB Ratio" value="91%" sub="↑88% bm" accent="success" />
          </div>
        </div>

        {/* Overall utilisation bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-ink">Week utilisation</p>
              <span className={`text-sm font-bold ${utilPct >= 90 ? "text-danger" : utilPct >= 70 ? "text-warning" : "text-success"}`}>{utilPct}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface2">
              <div
                className={`h-full rounded-full transition-all ${utilPct >= 90 ? "bg-danger" : utilPct >= 70 ? "bg-warning" : "bg-success"}`}
                style={{ width: `${utilPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-ink-muted">
              <span>0 t</span>
              <span className="font-semibold">{(totalBooked / 1000).toFixed(0)} t booked · {(totalAvail / 1000).toFixed(0)} t free</span>
              <span>{(totalCap / 1000).toFixed(0)} t</span>
            </div>
          </CardContent>
        </Card>

        {/* Flight cards */}
        {visibleFlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-ui py-16 text-center">
            <Plane className="h-10 w-10 text-ink-muted/40" />
            <p className="mt-3 text-sm font-semibold text-ink-muted">No flights scheduled for this week</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {visibleFlights.map((f) => {
              const st = STATUS_CONFIG[f.status];
              const pct = Math.round((f.bookedKg / f.totalCapacity) * 100);
              const availKg = f.totalCapacity - f.bookedKg;
              return (
                <Card key={f.id} className={`overflow-hidden ${f.status === "full" ? "opacity-70" : ""}`}>
                  {/* Status stripe */}
                  <div className={`h-1 ${st.barColor}`} />
                  <CardHeader className="pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-ink">{f.flightNo}</span>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-ink">
                          {f.origin}
                          {f.via && (
                            <>
                              <ArrowRight className="h-3 w-3 text-ink-muted" />
                              <span className="text-ink-muted">{f.via}</span>
                            </>
                          )}
                          <ArrowRight className="h-3 w-3 text-ink-muted" />
                          {f.destination}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-ink">{formatDate(f.departure)}</p>
                        <p className="text-xs text-ink-muted">{formatTime(f.departure)} → {formatTime(f.arrivalLocal)}</p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">{f.aircraft}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3">
                    {/* Capacity bar */}
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink-muted">Capacity</span>
                      <span className={`font-bold ${pct >= 90 ? "text-danger" : pct >= 70 ? "text-warning" : "text-success"}`}>{pct}% booked</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface2">
                      <div className={`h-full rounded-full ${st.barColor} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-ink-muted">
                      <span>{(f.bookedKg / 1000).toFixed(1)} t booked · {f.pieces} pcs</span>
                      <span className={`font-semibold ${availKg < 2000 ? "text-danger" : "text-success"}`}>
                        {(availKg / 1000).toFixed(1)} t free
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      <a
                        href={`/gsa/cargo-workspace?origin=${f.origin}&destination=${f.destination}&flight=${f.flightNo}&date=${f.departure.split("T")[0]}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand/25 bg-brand-light py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Find Rates
                      </a>
                      {f.status !== "full" && (
                        <button
                          type="button"
                          onClick={() => handleFbl(f)}
                          disabled={fblDone[f.id]}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                            fblDone[f.id]
                              ? "border-success/25 bg-success-bg text-success"
                              : "border-border-ui bg-surface text-ink-muted hover:border-brand/30 hover:text-brand"
                          }`}
                        >
                          {fblDone[f.id] ? <CheckCircle2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                          {fblDone[f.id] ? "FBL sent" : "Gen. FBL"}
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-[#0B7A52]/25 bg-success-bg px-5 py-3.5 shadow-2xl">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <p className="text-sm font-semibold text-success">{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} className="ml-2 text-success/60 hover:text-success"><X className="h-4 w-4" /></button>
        </div>
      )}
    </>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function MiniStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "brand" | "success" | "warning" }) {
  const c = accent === "brand" ? "text-brand" : accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-ink";
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className={`mt-1 text-xl font-bold ${c}`}>{value} {sub && <span className="text-sm font-semibold">{sub}</span>}</p>
      </CardContent>
    </Card>
  );
}
