"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileText, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, useCurrency } from "@/lib/currency-context";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Contract data ────────────────────────────────────────────────────────────

type ContractRecord = {
  id: string;
  partner: string;
  market: string;
  countries: string;
  start: string;  // YYYY-MM-DD
  end: string;
  status: Status;
  sla: "Platinum" | "Gold" | "Standard";
  commissionRate: number;
  kpi: { loadFactor: number; yieldPerKg: number; minMonthlyRevenue: number };
  actual: { loadFactor: number; yieldPerKg: number; revenue: number };
  monthlyLF: number[];
  monthlyRevenue: number[];
  penaltyClause: string;
};

const CONTRACTS: ContractRecord[] = [
  {
    id: "bwcs",
    partner: "BlueWing Cargo Solutions",
    market: "DACH",
    countries: "Germany · Austria · Switzerland",
    start: "2024-08-01",
    end: "2026-07-31",
    status: "active",
    sla: "Platinum",
    commissionRate: 5.5,
    kpi: { loadFactor: 77, yieldPerKg: 2.38, minMonthlyRevenue: 580000 },
    actual: { loadFactor: 83, yieldPerKg: 2.74, revenue: 658400 },
    monthlyLF: [79, 80, 82, 81, 84, 83],
    monthlyRevenue: [598000, 621000, 634000, 641000, 652000, 658400],
    penaltyClause: "3% revenue clawback if avg LF < 70% in any rolling 90-day window",
  },
  {
    id: "nlас",
    partner: "NordicLift Aviation Services",
    market: "Nordics",
    countries: "Sweden · Norway · Denmark · Finland",
    start: "2025-01-01",
    end: "2026-12-31",
    status: "pending",
    sla: "Gold",
    commissionRate: 6.0,
    kpi: { loadFactor: 72, yieldPerKg: 2.80, minMonthlyRevenue: 320000 },
    actual: { loadFactor: 80, yieldPerKg: 2.96, revenue: 352600 },
    monthlyLF: [74, 76, 78, 79, 81, 80],
    monthlyRevenue: [302000, 318000, 331000, 338000, 347000, 352600],
    penaltyClause: "Revenue minimum $320k/mo — shortfall billed at 50% of gap",
  },
  {
    id: "aap",
    partner: "Atlantic AirCargo Partners",
    market: "Iberia",
    countries: "Spain · Portugal · France",
    start: "2024-03-01",
    end: "2025-02-28",
    status: "expiring",
    sla: "Gold",
    commissionRate: 6.5,
    kpi: { loadFactor: 68, yieldPerKg: 2.18, minMonthlyRevenue: 270000 },
    actual: { loadFactor: 71, yieldPerKg: 2.31, revenue: 286900 },
    monthlyLF: [64, 66, 68, 70, 71, 71],
    monthlyRevenue: [261000, 268000, 272000, 279000, 283000, 286900],
    penaltyClause: "Yield floor $2.05/kg — below triggers renegotiation notice",
  },
];

const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function attainment(actual: number, target: number) {
  return Math.round((actual / target) * 100);
}

function attainmentColor(pct: number) {
  if (pct >= 100) return "text-emerald-500";
  if (pct >= 90) return "text-amber-400";
  return "text-red-400";
}

function attainmentBarColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 90) return "bg-amber-400";
  return "bg-red-400";
}

function contractProgress(start: string, end: string) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)));
}

function daysUntil(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const SLA_COLORS = {
  Platinum: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  Gold: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Standard: "text-ink-muted bg-surface2 border-border-ui",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiGauge({ label, target, actual, unit = "" }: { label: string; target: number; actual: number; unit?: string }) {
  const pct = attainment(actual, target);
  const barPct = Math.min(100, (actual / (target * 1.3)) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted">{label}</span>
        <span className={cn("text-xs font-semibold", attainmentColor(pct))}>
          {pct >= 100 ? "+" : ""}{pct - 100}pp
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface2">
        <div
          className={cn("h-full rounded-full transition-all", attainmentBarColor(pct))}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-ink-muted">
        <span>Target: {unit}{target}</span>
        <span className={cn("font-semibold", attainmentColor(pct))}>Actual: {unit}{actual}</span>
      </div>
    </div>
  );
}

function Sparkline({ data, color = "#22c55e" }: { data: number[]; color?: string }) {
  const chartData = data.map((v, i) => ({ m: MONTHS[i], v }));
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="m" hide />
        <Tooltip
          contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border-ui)", borderRadius: 6, fontSize: 11, padding: "4px 8px" }}
          itemStyle={{ color: "var(--color-ink)" }}
          formatter={(v: number) => [`${v}%`, "LF"]}
        />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color.replace("#", "")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ContractCard({ c }: { c: ContractRecord }) {
  const { currency } = useCurrency();
  const { symbol, rate } = currency;
  const fmt = (v: number) => formatMoney(v, symbol, rate);

  const lfPct = attainment(c.actual.loadFactor, c.kpi.loadFactor);
  const yieldPct = attainment(c.actual.yieldPerKg, c.kpi.yieldPerKg);
  const revPct = attainment(c.actual.revenue, c.kpi.minMonthlyRevenue);
  const avgAttainment = Math.round((lfPct + yieldPct + revPct) / 3);
  const progress = contractProgress(c.start, c.end);
  const endsIn = daysUntil(c.end);

  return (
    <Card className="flex flex-col gap-0 overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border-ui px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{c.partner}</p>
            <StatusBadge status={c.status} />
            <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", SLA_COLORS[c.sla])}>
              {c.sla}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">{c.countries}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-lg font-bold", attainmentColor(avgAttainment))}>{avgAttainment}%</p>
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">avg attainment</p>
        </div>
      </div>

      <div className="grid gap-5 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI gauges */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">KPI Targets vs Actual</p>
          <KpiGauge label="Load Factor" target={c.kpi.loadFactor} actual={c.actual.loadFactor} unit="" />
          <KpiGauge label="Yield / kg" target={c.kpi.yieldPerKg} actual={c.actual.yieldPerKg} unit="$" />
          <KpiGauge label="Monthly Revenue" target={c.kpi.minMonthlyRevenue} actual={c.actual.revenue} unit="" />
        </div>

        {/* LF trend sparkline */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">Load Factor Trend (6 mo)</p>
          <Sparkline data={c.monthlyLF} color={lfPct >= 100 ? "#22c55e" : lfPct >= 90 ? "#f59e0b" : "#f87171"} />
          <div className="flex items-center justify-between text-[10px] text-ink-muted">
            <span>Target: {c.kpi.loadFactor}%</span>
            <span className="font-semibold text-ink">{c.actual.loadFactor}% now</span>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">Contract Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-ink-muted">Commission</span>
              <span className="font-semibold text-ink">{c.commissionRate}%</span>
              <span className="text-ink-muted">Market</span>
              <span className="font-semibold text-ink">{c.market}</span>
              <span className="text-ink-muted">Revenue (act.)</span>
              <span className="font-semibold text-ink">{fmt(c.actual.revenue)}/mo</span>
            </div>
          </div>
        </div>

        {/* Contract timeline + penalty */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">Contract Period</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>{formatDate(c.start)}</span>
              <span>{formatDate(c.end)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface2">
              <div
                className={cn(
                  "h-full rounded-full",
                  c.status === "expiring" ? "bg-red-400" : "bg-brand",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-ink-muted">{progress}% elapsed</span>
              <span className={cn("font-semibold", endsIn < 90 ? "text-red-400" : "text-ink-muted")}>
                {endsIn > 0 ? `${endsIn}d remaining` : "Expired"}
              </span>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-border-ui bg-surface2/60 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Penalty Clause</p>
            <p className="text-xs text-ink-muted">{c.penaltyClause}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const { currency } = useCurrency();
  const { symbol, rate } = currency;
  const fmt = (v: number) => formatMoney(v, symbol, rate);

  const active = CONTRACTS.filter((c) => c.status === "active" || c.status === "expiring");
  const pending = CONTRACTS.filter((c) => c.status === "pending");
  const expiring = CONTRACTS.filter((c) => daysUntil(c.end) < 90 && c.status !== "pending");
  const avgAtt = Math.round(
    CONTRACTS.reduce((sum, c) => {
      const lfPct = attainment(c.actual.loadFactor, c.kpi.loadFactor);
      const yPct = attainment(c.actual.yieldPerKg, c.kpi.yieldPerKg);
      const rPct = attainment(c.actual.revenue, c.kpi.minMonthlyRevenue);
      return sum + (lfPct + yPct + rPct) / 3;
    }, 0) / CONTRACTS.length,
  );

  return (
    <>
      <Topbar title="Contracts & KPI" subtitle="Partner governance" />
      <main className="space-y-5 p-5">

        {/* Summary metrics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<FileText className="h-4 w-4" />}
            label="Active contracts"
            value={String(active.length)}
            sub={`${pending.length} pending activation`}
            accent="text-brand"
          />
          <SummaryCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg KPI attainment"
            value={`${avgAtt}%`}
            sub="across all KPI targets"
            accent="text-emerald-500"
          />
          <SummaryCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Contracts at risk"
            value="0"
            sub="All partners above target"
            accent="text-ink-muted"
          />
          <SummaryCard
            icon={<Clock className="h-4 w-4" />}
            label="Expiring in 90 days"
            value={String(expiring.length)}
            sub={expiring.length > 0 ? expiring.map((c) => c.market).join(", ") : "No renewals due"}
            accent={expiring.length > 0 ? "text-red-400" : "text-ink-muted"}
          />
        </div>

        {/* Contract detail cards */}
        {CONTRACTS.map((c) => (
          <ContractCard key={c.id} c={c} />
        ))}

        {/* Full register table */}
        <Card>
          <CardHeader>
            <CardTitle>Contract register</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border-ui bg-surface text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    {["Partner", "Market", "Period", "Commission", "LF Target", "Yield Target", "Rev. Min / mo", "SLA", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-ui">
                  {CONTRACTS.map((c) => (
                    <tr key={c.id} className="bg-page text-ink-muted hover:bg-surface2/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{c.partner}</p>
                        <p className="text-xs text-ink-muted">{c.countries}</p>
                      </td>
                      <td className="px-4 py-3">{c.market}</td>
                      <td className="px-4 py-3 text-xs">
                        <p>{formatDate(c.start)}</p>
                        <p className="text-ink-muted">→ {formatDate(c.end)}</p>
                      </td>
                      <td className="px-4 py-3">{c.commissionRate}%</td>
                      <td className="px-4 py-3">
                        <span className={cn("font-semibold", attainmentColor(attainment(c.actual.loadFactor, c.kpi.loadFactor)))}>
                          {c.actual.loadFactor}%
                        </span>
                        <span className="text-ink-muted"> / {c.kpi.loadFactor}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("font-semibold", attainmentColor(attainment(c.actual.yieldPerKg, c.kpi.yieldPerKg)))}>
                          ${c.actual.yieldPerKg.toFixed(2)}
                        </span>
                        <span className="text-ink-muted"> / ${c.kpi.yieldPerKg.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("font-semibold", attainmentColor(attainment(c.actual.revenue, c.kpi.minMonthlyRevenue)))}>
                          {fmt(c.actual.revenue)}
                        </span>
                        <p className="text-xs text-ink-muted">min {fmt(c.kpi.minMonthlyRevenue)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", SLA_COLORS[c.sla])}>
                          {c.sla}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface2 p-4">
      <div className="flex items-center gap-2 text-ink-muted">
        <span className={accent}>{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className={cn("mt-2 text-2xl font-bold", accent)}>{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
    </div>
  );
}
