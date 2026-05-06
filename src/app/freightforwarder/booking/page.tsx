"use client";

import { useState } from "react";
import { CheckCircle2, PlaneTakeoff } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const availableFlights = [
  { id: "f1", flight: "ABR214", airline: "AeroBridge Cargo", origin: "FRA", destination: "DXB", departure: "May 8, 23:15", arrival: "May 9, 06:40", transit: "7h 25m", availableKg: 4800, ratePerKg: 2.83, direct: true },
  { id: "f2", flight: "TKC403", airline: "Turkish Cargo", origin: "FRA", destination: "DXB", departure: "May 9, 01:45", arrival: "May 9, 09:10", transit: "7h 25m (via IST)", availableKg: 3200, ratePerKg: 2.61, direct: false },
  { id: "f3", flight: "ABR601", airline: "AeroBridge Cargo", origin: "MUC", destination: "SIN", departure: "May 8, 22:00", arrival: "May 10, 14:30", transit: "16h 30m", availableKg: 6100, ratePerKg: 3.06, direct: true },
  { id: "f4", flight: "NSA921", airline: "NorthStar Airways", origin: "MAD", destination: "JFK", departure: "May 9, 14:20", arrival: "May 9, 17:55", transit: "9h 35m", availableKg: 2900, ratePerKg: 2.46, direct: true },
  { id: "f5", flight: "PLC509", airline: "PolarLine Cargo", origin: "OSL", destination: "ICN", departure: "May 10, 06:00", arrival: "May 11, 22:15", transit: "16h 15m", availableKg: 5400, ratePerKg: 3.01, direct: true },
];

const airports = ["FRA – Frankfurt", "MUC – Munich", "VIE – Vienna", "MAD – Madrid", "LIS – Lisbon", "OSL – Oslo", "CPH – Copenhagen", "DXB – Dubai", "SIN – Singapore", "JFK – New York", "ICN – Seoul", "PVG – Shanghai"];
const products = ["General Cargo", "Pharma / GDP", "Perishables", "Seafood", "High Value", "E-commerce", "Dangerous Goods", "Automotive"];

export default function BookingPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  function handleBook() {
    if (selected) setBooked(true);
  }

  return (
    <>
      <Topbar title="Book shipment" subtitle="Freight Forwarder" />
      <main className="p-5">
        <div className="mx-auto max-w-6xl">
          {booked ? (
            <Card className="mx-auto max-w-lg text-center">
              <CardContent className="p-10">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                <h2 className="mt-4 text-xl font-semibold text-white">Booking confirmed</h2>
                <p className="mt-2 text-sm text-slate-400">Your space reservation has been submitted. An AWB will be issued within 2 hours.</p>
                <Button className="mt-6" onClick={() => { setBooked(false); setSelected(null); }}>
                  New booking
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
              {/* Booking form */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipment details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Origin airport</label>
                    <Select>
                      <option value="">Select origin</option>
                      {airports.map((a) => <option key={a}>{a}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Destination airport</label>
                    <Select>
                      <option value="">Select destination</option>
                      {airports.map((a) => <option key={a}>{a}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Earliest departure</label>
                    <Input type="date" defaultValue="2026-05-08" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Weight (kg)</label>
                      <Input type="number" placeholder="e.g. 500" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Volume (cbm)</label>
                      <Input type="number" placeholder="e.g. 2.4" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Product type</label>
                    <Select>
                      <option value="">Select product</option>
                      {products.map((p) => <option key={p}>{p}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Special handling (optional)</label>
                    <Input placeholder="e.g. GDP-certified, temperature 2–8°C" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Shipper reference</label>
                    <Input placeholder="Your internal reference" />
                  </div>
                  <Button className="w-full" disabled={!selected} onClick={handleBook}>
                    {selected ? "Confirm booking" : "Select a flight first"}
                  </Button>
                </CardContent>
              </Card>

              {/* Available flights */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-400">Available flights</h2>
                {availableFlights.map((flight) => (
                  <button
                    key={flight.id}
                    type="button"
                    onClick={() => setSelected(flight.id === selected ? null : flight.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selected === flight.id
                        ? "border-cyan-400/60 bg-cyan-400/5"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <PlaneTakeoff className="h-5 w-5 shrink-0 text-cyan-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{flight.flight}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-sm text-slate-300">{flight.airline}</span>
                            {flight.direct && <Badge variant="success">Direct</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-slate-400">
                            {flight.origin} → {flight.destination} · {flight.transit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-white">${flight.ratePerKg.toFixed(2)}<span className="text-sm font-normal text-slate-400">/kg</span></p>
                        <p className="text-xs text-slate-500">{flight.availableKg.toLocaleString()} kg available</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-400 sm:grid-cols-4">
                      <span>Dep: <span className="text-slate-200">{flight.departure}</span></span>
                      <span>Arr: <span className="text-slate-200">{flight.arrival}</span></span>
                      <span>Transit: <span className="text-slate-200">{flight.transit}</span></span>
                      <span>Capacity: <span className="text-slate-200">{flight.availableKg.toLocaleString()} kg</span></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
