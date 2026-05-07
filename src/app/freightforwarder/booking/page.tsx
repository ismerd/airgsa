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
                <h2 className="mt-4 text-xl font-semibold text-ink">Booking confirmed</h2>
                <p className="mt-2 text-sm text-ink-muted">Your space reservation has been submitted. An AWB will be issued within 2 hours.</p>
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
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Origin airport</label>
                    <Select>
                      <option value="">Select origin</option>
                      {airports.map((a) => <option key={a}>{a}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Destination airport</label>
                    <Select>
                      <option value="">Select destination</option>
                      {airports.map((a) => <option key={a}>{a}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Earliest departure</label>
                    <Input type="date" defaultValue="2026-05-08" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Weight (kg)</label>
                      <Input type="number" placeholder="e.g. 500" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Volume (cbm)</label>
                      <Input type="number" placeholder="e.g. 2.4" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Product type</label>
                    <Select>
                      <option value="">Select product</option>
                      {products.map((p) => <option key={p}>{p}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Special handling (optional)</label>
                    <Input placeholder="e.g. GDP-certified, temperature 2–8°C" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Shipper reference</label>
                    <Input placeholder="Your internal reference" />
                  </div>
                  <Button className="w-full" disabled={!selected} onClick={handleBook}>
                    {selected ? "Confirm booking" : "Select a flight first"}
                  </Button>
                </CardContent>
              </Card>

              {/* Available flights */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-ink-muted">Available flights</h2>
                {availableFlights.map((flight) => (
                  <button
                    key={flight.id}
                    type="button"
                    onClick={() => setSelected(flight.id === selected ? null : flight.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selected === flight.id
                        ? "border-brand/60 bg-brand-light"
                        : "border-border-ui bg-surface hover:border-border-ui hover:bg-surface2"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <PlaneTakeoff className="h-5 w-5 shrink-0 text-brand" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">{flight.flight}</span>
                            <span className="text-ink-muted">·</span>
                            <span className="text-sm text-ink-muted">{flight.airline}</span>
                            {flight.direct && <Badge variant="success">Direct</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-ink-muted">
                            {flight.origin} → {flight.destination} · {flight.transit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-ink">${flight.ratePerKg.toFixed(2)}<span className="text-sm font-normal text-ink-muted">/kg</span></p>
                        <p className="text-xs text-ink-muted">{flight.availableKg.toLocaleString()} kg available</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-ink-muted sm:grid-cols-4">
                      <span>Dep: <span className="text-ink">{flight.departure}</span></span>
                      <span>Arr: <span className="text-ink">{flight.arrival}</span></span>
                      <span>Transit: <span className="text-ink">{flight.transit}</span></span>
                      <span>Capacity: <span className="text-ink">{flight.availableKg.toLocaleString()} kg</span></span>
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
