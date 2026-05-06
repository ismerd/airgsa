"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, Loader2, MapPin, Search } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TrackingEvent = {
  label: string;
  location: string;
  time: string;
  done: boolean;
  active?: boolean;
};

type AwbRecord = {
  awb: string;
  origin: string;
  destination: string;
  airline: string;
  flight: string;
  weightKg: number;
  pieces: number;
  product: string;
  status: string;
  eta: string;
  rate: number;
  events: TrackingEvent[];
};

const awbDatabase: Record<string, AwbRecord> = {
  "235-12345678": {
    awb: "235-12345678",
    origin: "FRA – Frankfurt",
    destination: "DXB – Dubai",
    airline: "AeroBridge Cargo",
    flight: "ABR214",
    weightKg: 2340,
    pieces: 12,
    product: "Pharma / GDP",
    status: "in-transit",
    eta: "May 7, 2026 06:40",
    rate: 2.83,
    events: [
      { label: "Booking confirmed", location: "FRA", time: "May 4, 2026 09:22", done: true },
      { label: "Cargo accepted at origin", location: "FRA Cargo Centre", time: "May 5, 2026 14:10", done: true },
      { label: "Shipment cleared customs", location: "FRA", time: "May 5, 2026 18:35", done: true },
      { label: "Loaded on board", location: "FRA – ABR214", time: "May 6, 2026 22:48", done: true },
      { label: "Departed origin", location: "FRA Airport", time: "May 6, 2026 23:15", done: true },
      { label: "In transit", location: "En route to DXB", time: "Estimated May 7, 06:40", done: false, active: true },
      { label: "Arrived at destination", location: "DXB", time: "Estimated May 7, 06:40", done: false },
      { label: "Customs clearance", location: "DXB", time: "–", done: false },
      { label: "Available for delivery", location: "DXB Cargo", time: "–", done: false },
    ],
  },
  "235-98765432": {
    awb: "235-98765432",
    origin: "MUC – Munich",
    destination: "SIN – Singapore",
    airline: "AeroBridge Cargo",
    flight: "ABR601",
    weightKg: 560,
    pieces: 4,
    product: "High Value",
    status: "in-transit",
    eta: "May 8, 2026 14:30",
    rate: 3.06,
    events: [
      { label: "Booking confirmed", location: "MUC", time: "May 3, 2026 11:00", done: true },
      { label: "Cargo accepted at origin", location: "MUC Cargo Centre", time: "May 4, 2026 10:45", done: true },
      { label: "Shipment cleared customs", location: "MUC", time: "May 4, 2026 15:20", done: true },
      { label: "Loaded on board", location: "MUC – ABR601", time: "May 5, 2026 21:30", done: true },
      { label: "Departed origin", location: "MUC Airport", time: "May 5, 2026 22:00", done: true },
      { label: "In transit", location: "En route to SIN", time: "Estimated May 8, 14:30", done: false, active: true },
      { label: "Arrived at destination", location: "SIN Changi", time: "Estimated May 8, 14:30", done: false },
      { label: "Available for delivery", location: "SIN Cargo", time: "–", done: false },
    ],
  },
  "176-44556677": {
    awb: "176-44556677",
    origin: "IST – Istanbul",
    destination: "FRA – Frankfurt",
    airline: "Turkish Cargo",
    flight: "TKC403",
    weightKg: 1280,
    pieces: 8,
    product: "General Cargo",
    status: "delivered",
    eta: "May 5, 2026 08:55",
    rate: 2.31,
    events: [
      { label: "Booking confirmed", location: "IST", time: "Apr 30, 2026 13:00", done: true },
      { label: "Cargo accepted at origin", location: "IST Cargo Centre", time: "May 1, 2026 16:40", done: true },
      { label: "Shipment cleared customs", location: "IST", time: "May 2, 2026 09:15", done: true },
      { label: "Loaded on board", location: "IST – TKC403", time: "May 2, 2026 05:10", done: true },
      { label: "Departed origin", location: "IST Airport", time: "May 2, 2026 06:20", done: true },
      { label: "Arrived at destination", location: "FRA Airport", time: "May 2, 2026 08:55", done: true },
      { label: "Customs clearance", location: "FRA", time: "May 2, 2026 12:30", done: true },
      { label: "Available for delivery", location: "FRA Cargo Centre", time: "May 2, 2026 14:00", done: true },
      { label: "Delivered", location: "Consignee warehouse", time: "May 3, 2026 10:20", done: true },
    ],
  },
  "080-77889900": {
    awb: "080-77889900",
    origin: "MAD – Madrid",
    destination: "JFK – New York",
    airline: "NorthStar Airways",
    flight: "NSA921",
    weightKg: 890,
    pieces: 6,
    product: "Perishables",
    status: "delayed",
    eta: "May 9, 2026 17:55",
    rate: 2.46,
    events: [
      { label: "Booking confirmed", location: "MAD", time: "May 2, 2026 08:00", done: true },
      { label: "Cargo accepted at origin", location: "MAD Cargo Centre", time: "May 4, 2026 09:30", done: true },
      { label: "Delayed – flight rescheduled", location: "MAD", time: "May 5, 2026 – delay notice", done: true, active: true },
      { label: "Departed origin", location: "MAD Airport", time: "Estimated May 9, 14:20", done: false },
      { label: "Arrived at destination", location: "JFK", time: "Estimated May 9, 17:55", done: false },
      { label: "Available for delivery", location: "JFK Cargo", time: "–", done: false },
    ],
  },
  "074-11223344": {
    awb: "074-11223344",
    origin: "OSL – Oslo",
    destination: "ICN – Seoul",
    airline: "PolarLine Cargo",
    flight: "PLC509",
    weightKg: 3100,
    pieces: 18,
    product: "Seafood",
    status: "booked",
    eta: "May 12, 2026 22:15",
    rate: 3.01,
    events: [
      { label: "Booking confirmed", location: "OSL", time: "May 5, 2026 15:00", done: true },
      { label: "Cargo acceptance window", location: "OSL Cargo Centre", time: "May 9–10, 2026", done: false, active: true },
      { label: "Shipment cleared customs", location: "OSL", time: "–", done: false },
      { label: "Departed origin", location: "OSL Airport", time: "Estimated May 10, 06:00", done: false },
      { label: "Arrived at destination", location: "ICN Incheon", time: "Estimated May 12, 22:15", done: false },
      { label: "Available for delivery", location: "ICN Cargo", time: "–", done: false },
    ],
  },
};

const statusVariant: Record<string, "success" | "warning" | "danger" | "default" | "muted"> = {
  "in-transit": "default",
  delivered: "success",
  delayed: "danger",
  booked: "muted",
};

export default function TrackingPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AwbRecord | null | "not-found">(null);

  function search() {
    const clean = query.trim();
    const found = awbDatabase[clean];
    setResult(found ?? "not-found");
  }

  return (
    <>
      <Topbar title="AWB Tracking" subtitle="Freight Forwarder" />
      <main className="p-5">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Track your shipment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-slate-400">
                Enter an Air Waybill number to see real-time status and tracking events.
                <span className="ml-1 text-slate-500">Try: 235-12345678 · 176-44556677 · 080-77889900</span>
              </p>
              <div className="flex gap-3">
                <Input
                  placeholder="e.g. 235-12345678"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  className="font-mono"
                />
                <Button onClick={search}>
                  <Search className="mr-2 h-4 w-4" />
                  Track
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          {result === "not-found" && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-400">No shipment found for <span className="font-mono text-white">{query}</span>.</p>
                <p className="mt-1 text-sm text-slate-500">Check the AWB number and try again.</p>
              </CardContent>
            </Card>
          )}

          {result && result !== "not-found" && (
            <>
              {/* Shipment summary */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-lg font-semibold text-cyan-300">{result.awb}</p>
                      <p className="mt-1 text-xl font-semibold text-white">{result.origin} → {result.destination}</p>
                      <p className="mt-1 text-sm text-slate-400">{result.airline} · {result.flight}</p>
                    </div>
                    <Badge variant={statusVariant[result.status]} className="text-sm">{result.status}</Badge>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    {[
                      { label: "Weight", value: `${result.weightKg.toLocaleString()} kg` },
                      { label: "Pieces", value: String(result.pieces) },
                      { label: "Product", value: result.product },
                      { label: "ETA", value: result.eta },
                    ].map((d) => (
                      <div key={d.label}>
                        <p className="text-xs text-slate-500">{d.label}</p>
                        <p className="mt-0.5 font-medium text-white">{d.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Tracking events</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-0">
                    {result.events.map((event, i) => {
                      const isLast = i === result.events.length - 1;
                      return (
                        <li key={i} className="flex gap-4">
                          {/* Connector */}
                          <div className="flex flex-col items-center">
                            {event.done ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                            ) : event.active ? (
                              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan-400" />
                            ) : (
                              <Circle className="h-5 w-5 shrink-0 text-slate-600" />
                            )}
                            {!isLast && (
                              <div className={`my-1 w-px flex-1 ${event.done ? "bg-emerald-400/30" : "bg-white/10"}`} style={{ minHeight: "28px" }} />
                            )}
                          </div>
                          {/* Content */}
                          <div className="pb-6">
                            <p className={`text-sm font-semibold ${event.done ? "text-white" : event.active ? "text-cyan-300" : "text-slate-500"}`}>
                              {event.label}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.time}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </>
  );
}
