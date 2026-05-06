"use client";

import { useState } from "react";
import { ArrowRight, Clock, PlaneTakeoff, Zap } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

type RouteOption = {
  id: string;
  airline: string;
  flights: string[];
  stops: number;
  transit: string;
  departureDays: string;
  ratePerKg: number;
  minKg: number;
  highlighted?: boolean;
};

const routeDatabase: Record<string, RouteOption[]> = {
  "FRA-DXB": [
    { id: "r1", airline: "AeroBridge Cargo", flights: ["ABR214"], stops: 0, transit: "7h 25m", departureDays: "Daily", ratePerKg: 2.83, minKg: 100, highlighted: true },
    { id: "r2", airline: "Turkish Cargo", flights: ["TKC403", "TKC-DXB"], stops: 1, transit: "11h 10m", departureDays: "Daily", ratePerKg: 2.51, minKg: 50 },
  ],
  "MUC-SIN": [
    { id: "r3", airline: "AeroBridge Cargo", flights: ["ABR601"], stops: 0, transit: "16h 30m", departureDays: "5x weekly", ratePerKg: 3.06, minKg: 100, highlighted: true },
    { id: "r4", airline: "Turkish Cargo", flights: ["TKC403", "TKC-SIN"], stops: 1, transit: "21h 00m", departureDays: "Daily", ratePerKg: 2.88, minKg: 50 },
  ],
  "OSL-ICN": [
    { id: "r5", airline: "PolarLine Cargo", flights: ["PLC509"], stops: 0, transit: "16h 15m", departureDays: "4x weekly", ratePerKg: 3.01, minKg: 200, highlighted: true },
    { id: "r6", airline: "Turkish Cargo", flights: ["PLC509", "TKC-ICN"], stops: 1, transit: "22h 30m", departureDays: "3x weekly", ratePerKg: 2.74, minKg: 100 },
  ],
  "MAD-JFK": [
    { id: "r7", airline: "NorthStar Airways", flights: ["NSA921"], stops: 0, transit: "9h 35m", departureDays: "Daily", ratePerKg: 2.46, minKg: 50, highlighted: true },
    { id: "r8", airline: "AeroBridge Cargo", flights: ["ABR-MAD", "ABR744"], stops: 1, transit: "14h 20m", departureDays: "3x weekly", ratePerKg: 2.28, minKg: 100 },
  ],
};

const airports = [
  { code: "FRA", name: "Frankfurt" },
  { code: "MUC", name: "Munich" },
  { code: "VIE", name: "Vienna" },
  { code: "MAD", name: "Madrid" },
  { code: "LIS", name: "Lisbon" },
  { code: "OSL", name: "Oslo" },
  { code: "CPH", name: "Copenhagen" },
  { code: "BCN", name: "Barcelona" },
  { code: "DXB", name: "Dubai" },
  { code: "SIN", name: "Singapore" },
  { code: "JFK", name: "New York" },
  { code: "ORD", name: "Chicago" },
  { code: "ICN", name: "Seoul" },
  { code: "PVG", name: "Shanghai" },
];

export default function RoutesPage() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [results, setResults] = useState<RouteOption[] | null>(null);
  const [searched, setSearched] = useState(false);

  function search() {
    const key = `${origin}-${destination}`;
    setResults(routeDatabase[key] ?? []);
    setSearched(true);
  }

  return (
    <>
      <Topbar title="Find route" subtitle="Freight Forwarder" />
      <main className="p-5">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Route search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-slate-400">Find available air cargo routes between airports. Try FRA → DXB or OSL → ICN.</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-400">Origin</label>
                  <Select value={origin} onChange={(e) => setOrigin((e.target as HTMLSelectElement).value)}>
                    <option value="">Select origin</option>
                    {airports.map((a) => <option key={a.code} value={a.code}>{a.code} – {a.name}</option>)}
                  </Select>
                </div>
                <div className="hidden sm:flex sm:pb-2">
                  <ArrowRight className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-400">Destination</label>
                  <Select value={destination} onChange={(e) => setDestination((e.target as HTMLSelectElement).value)}>
                    <option value="">Select destination</option>
                    {airports.map((a) => <option key={a.code} value={a.code}>{a.code} – {a.name}</option>)}
                  </Select>
                </div>
                <Button onClick={search} disabled={!origin || !destination}>
                  <PlaneTakeoff className="mr-2 h-4 w-4" />
                  Search routes
                </Button>
              </div>
            </CardContent>
          </Card>

          {searched && results !== null && (
            results.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-slate-400">No direct or connecting routes found for <span className="text-white">{origin} → {destination}</span>.</p>
                  <p className="mt-1 text-sm text-slate-500">Try a different origin or destination.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">{results.length} route{results.length > 1 ? "s" : ""} found for <span className="text-white">{origin} → {destination}</span></p>
                {results.map((route) => (
                  <Card key={route.id} className={route.highlighted ? "border-cyan-400/30" : ""}>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{route.airline}</span>
                            {route.highlighted && (
                              <Badge variant="default" className="flex items-center gap-1">
                                <Zap className="h-3 w-3" /> Best option
                              </Badge>
                            )}
                            {route.stops === 0 ? (
                              <Badge variant="success">Direct</Badge>
                            ) : (
                              <Badge variant="muted">{route.stops} stop</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-400">
                            {route.flights.join(" → ")} · {origin} → {destination}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold text-white">
                            ${route.ratePerKg.toFixed(2)}<span className="text-sm font-normal text-slate-400">/kg</span>
                          </p>
                          <p className="text-xs text-slate-500">min {route.minKg} kg</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="h-4 w-4 text-cyan-400" />
                          <span>Transit: <span className="text-white">{route.transit}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <PlaneTakeoff className="h-4 w-4 text-cyan-400" />
                          <span>Frequency: <span className="text-white">{route.departureDays}</span></span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm">Book this route</Button>
                        <Button size="sm" variant="outline">Request quote</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      </main>
    </>
  );
}
