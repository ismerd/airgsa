"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

