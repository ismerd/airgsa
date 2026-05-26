"use client";

import React from "react";
import { useCurrency } from "@/lib/currency-context";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CountryPerformance, GsaPerformance } from "@/lib/performance-types";
import type { KpiPoint } from "@/lib/types";

type ChartCurrencyProps = { currencySymbol?: string; currencyCode?: string; headerControls?: React.ReactNode };

export function RevenueChart({ data, currencySymbol = "$", currencyCode = "USD", headerControls }: { data: KpiPoint[] } & ChartCurrencyProps) {
  const maxRevenue = data.length > 0 ? Math.max(...data.map((d) => d.revenue)) : 0;
  const maxLabelLen = `${currencySymbol}${Math.round(maxRevenue / 1000)}k`.length;
  const yAxisWidth = Math.max(52, maxLabelLen * 9 + 8);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <CardTitle className="pt-0.5">Revenue and loadfactor trend</CardTitle>
        {headerControls}
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-ui)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--ink-muted)" tickLine={false} axisLine={false} />
            <YAxis width={yAxisWidth} stroke="var(--ink-muted)" tickLine={false} axisLine={false} tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-ui)", borderRadius: 10, color: "var(--ink)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
              formatter={(v) => [`${currencySymbol}${Number(v).toLocaleString()}`, `Revenue (${currencyCode})`]}
            />
            <Area type="monotone" dataKey="revenue" stroke="#60A5FA" fill="url(#revenue)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function YieldChart({ data, currencySymbol = "$", currencyCode = "USD", headerControls }: { data: KpiPoint[] } & ChartCurrencyProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Yield per kg</CardTitle>
        {headerControls}
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="var(--border-ui)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--ink-muted)" tickLine={false} axisLine={false} />
            <YAxis stroke="var(--ink-muted)" tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(2)} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-ui)", borderRadius: 10, color: "var(--ink)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
              formatter={(v) => [`${currencySymbol}${Number(v).toFixed(2)}`, `Yield / kg (${currencyCode})`]}
            />
            <Bar dataKey="yield" fill="#22D3EE" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CountryPerformanceChart({ data }: { data: CountryPerformance[] }) {
  const { currency } = useCurrency();
  const { symbol, rate } = currency;
  const fmtShort = (v: number) => `${symbol}${Math.round((v * rate) / 1000)}k`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Country revenue and loadfactor</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid stroke="var(--border-ui)" vertical={false} />
            <XAxis dataKey="code" stroke="var(--ink-muted)" tickLine={false} axisLine={false} />
            <YAxis yAxisId="revenue" stroke="var(--ink-muted)" tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
            <YAxis
              yAxisId="loadFactor"
              orientation="right"
              domain={[50, 100]}
              stroke="var(--ink-muted)"
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-ui)", borderRadius: 10, color: "var(--ink)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
              formatter={(value, name) => {
                if (name === "revenue") return [fmtShort(Number(value)), "Revenue"];
                if (name === "loadFactor") return [`${value}%`, "Load factor"];
                return [value, name];
              }}
            />
            <Bar yAxisId="revenue" dataKey="revenue" fill="#60A5FA" radius={[6, 6, 0, 0]} />
            <Line yAxisId="loadFactor" dataKey="loadFactor" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

const GSA_COLORS = ["#60A5FA", "#22D3EE", "#F59E0B", "#A78BFA"];

export function GsaPerformanceChart({ data }: { data: GsaPerformance[] }) {
  const { currency } = useCurrency();
  const { symbol, rate } = currency;
  const fmtShort = (v: number) => `${symbol}${Math.round((v * rate) / 1000)}k`;

  const total = data.reduce((s, d) => s + d.revenue, 0);
  const maxRevenue = data.reduce((max, d) => Math.max(max, d.revenue), 0);
  const pieData = data.map((d, i) => ({
    key: `${d.gsaName}-${d.assignedMarkets}-${i}`,
    name: d.gsaName,
    value: d.revenue,
    color: GSA_COLORS[i % GSA_COLORS.length],
    pct: total > 0 ? Math.round((d.revenue / total) * 100) : 0,
    barPct: maxRevenue > 0 ? Math.round((d.revenue / maxRevenue) * 100) : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales channel revenue share</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-ui)", borderRadius: 10, color: "var(--ink)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
                  formatter={(value, name) => [fmtShort(Number(value)), name]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Total</p>
              <p className="text-sm font-bold text-ink">{fmtShort(total)}</p>
            </div>
          </div>

          {/* Legend with values */}
          <div className="flex-1 space-y-3">
            {pieData.map((entry) => (
              <div key={entry.key} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">{entry.name}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${entry.barPct}%`, background: entry.color }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-ink">{entry.pct}%</p>
                  <p className="text-[10px] text-ink-muted">{fmtShort(entry.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
