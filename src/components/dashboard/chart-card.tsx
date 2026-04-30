"use client";

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

export function RevenueChart({ data }: { data: KpiPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue and loadfactor trend</CardTitle>
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
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }} />
            <Area type="monotone" dataKey="revenue" stroke="#00AEEF" fill="url(#revenue)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function YieldChart({ data }: { data: KpiPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yield per kg</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }} />
            <Bar dataKey="yield" fill="#7dd3fc" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CountryPerformanceChart({ data }: { data: CountryPerformance[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Country revenue and loadfactor</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="country" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis yAxisId="revenue" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="loadFactor"
              orientation="right"
              domain={[50, 100]}
              stroke="#94a3b8"
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}
              formatter={(value, name) => {
                if (name === "revenue") return [formatShortCurrency(Number(value)), "Revenue"];
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commissioned GSA performance</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24, right: 8 }}>
            <CartesianGrid stroke="#1e293b" horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis dataKey="gsaName" type="category" width={140} stroke="#94a3b8" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}
              formatter={(value, name) => {
                if (name === "revenue") return [formatShortCurrency(Number(value)), "Revenue"];
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

function formatShortCurrency(value: number) {
  return `$${Math.round(value / 1000)}k`;
}
