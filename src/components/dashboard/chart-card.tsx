"use client";

import React from "react";
import { useCurrency } from "@/lib/currency-context";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CountryPerformance, GsaPerformance } from "@/lib/airline-performance-data";
import type { KpiPoint } from "@/lib/types";

type ChartCurrencyProps = { currencySymbol?: string; currencyCode?: string; headerControls?: React.ReactNode };

export function RevenueChart({ data, currencySymbol = "$", currencyCode = "USD", headerControls }: { data: KpiPoint[] } & ChartCurrencyProps) {
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
                <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#00AEEF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid rgba(0,0,0,.08)", borderRadius: 8, color: "#1e293b" }}
              formatter={(v) => [`${currencySymbol}${Number(v).toLocaleString()}`, `Revenue (${currencyCode})`]}
            />
            <Area type="monotone" dataKey="revenue" stroke="#00AEEF" fill="url(#revenue)" strokeWidth={2} />
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
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(2)} />
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid rgba(0,0,0,.08)", borderRadius: 8, color: "#1e293b" }}
              formatter={(v) => [`${currencySymbol}${Number(v).toFixed(2)}`, `Yield / kg (${currencyCode})`]}
            />
            <Bar dataKey="yield" fill="#7dd3fc" radius={[6, 6, 0, 0]} />
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
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="code" stroke="#64748b" tickLine={false} axisLine={false} />
            <YAxis yAxisId="revenue" stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
            <YAxis
              yAxisId="loadFactor"
              orientation="right"
              domain={[50, 100]}
              stroke="#64748b"
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid rgba(0,0,0,.08)", borderRadius: 8, color: "#1e293b" }}
              formatter={(value, name) => {
                if (name === "revenue") return [fmtShort(Number(value)), "Revenue"];
                if (name === "loadFactor") return [`${value}%`, "Load factor"];
                return [value, name];
              }}
            />
            <Bar yAxisId="revenue" dataKey="revenue" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            <Line yAxisId="loadFactor" dataKey="loadFactor" stroke="#facc15" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function GsaPerformanceChart({ data }: { data: GsaPerformance[] }) {
  const { currency } = useCurrency();
  const { symbol, rate } = currency;
  const fmtShort = (v: number) => `${symbol}${Math.round((v * rate) / 1000)}k`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commissioned GSA performance</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24, right: 8 }}>
            <CartesianGrid stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
            <YAxis dataKey="gsaName" type="category" width={140} stroke="#64748b" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid rgba(0,0,0,.08)", borderRadius: 8, color: "#1e293b" }}
              formatter={(value, name) => {
                if (name === "revenue") return [fmtShort(Number(value)), "Revenue"];
                return [value, name];
              }}
            />
            <Bar dataKey="revenue" fill="#22c55e" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
