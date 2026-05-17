"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  FileText,
  PackageCheck,
  Plane,
  Search,
  TrendingUp,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MandateBooking } from "@/lib/services/mandate-execution-store";

type AssignedRoute = {
  id: string;
  contractId: string;
  airline: string;
  origin: string;
  destination: string;
  operatingDays?: string;
  weekday?: string;
  frequencyPerWeek: number;
  aircraft?: string;
};

type FlightCard = {
  id: string;
  flightNo: string;
  origin: string;
  destination: string;
  flightDate: string;
  aircraft: string;
  bookedKg: number;
  pieces: number;
  revenue: number;
  status: MandateBooking["status"];
  awbNumbers: string[];
  customers: string[];
};

export default function FlightsPage() {
  const [routes, setRoutes] = useState<AssignedRoute[]>([]);
  const [bookings, setBookings] = useState<MandateBooking[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setError(null);
    try {
      const [routeRes, bookingRes] = await Promise.all([
        fetch("/api/gsa/routes", { cache: "no-store" }),
        fetch("/api/bookings", { cache: "no-store" }),
      ]);
      const [routeData, bookingData] = await Promise.all([routeRes.json(), bookingRes.json()]);
      if (!routeRes.ok) throw new Error(routeData.error ?? "Routes could not be loaded");
      if (!bookingRes.ok) throw new Error(bookingData.error ?? "Bookings could not be loaded");
      setRoutes(routeData.routes ?? []);
      setBookings(bookingData.bookings ?? []);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const flights = useMemo(() => buildFlights(bookings, routes), [bookings, routes]);
  const filteredFlights = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return flights;
    return flights.filter((flight) =>
      flight.flightNo.toLowerCase().includes(term) ||
      flight.origin.toLowerCase().includes(term) ||
      flight.destination.toLowerCase().includes(term) ||
      flight.awbNumbers.some((awb) => awb.toLowerCase().includes(term)) ||
      flight.customers.some((customer) => customer.toLowerCase().includes(term)),
    );
  }, [flights, query]);

  const bookedKg = bookings.reduce((sum, booking) => sum + (booking.flownWeightKg ?? booking.bookedWeightKg ?? booking.weightKg), 0);
  const bookedRevenue = bookings.reduce((sum, booking) => sum + (booking.finalRevenueAmount ?? booking.bookedRevenueAmount ?? booking.revenueAmount), 0);
  const activeBookings = bookings.filter((booking) => booking.status === "booked").length;
  const flownBookings = bookings.filter((booking) => booking.status === "flown").length;

  return (
    <>
      <Topbar title="Flight Schedule" subtitle="Booked contract flights and assigned route coverage" />
      <main className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MiniStat label="Assigned routes" value={String(routes.length)} icon={<ArrowRight className="h-5 w-5" />} />
          <MiniStat label="Booked flights" value={String(flights.length)} icon={<Plane className="h-5 w-5" />} accent="brand" />
          <MiniStat label="Active AWBs" value={String(activeBookings)} icon={<PackageCheck className="h-5 w-5" />} accent="warning" />
          <MiniStat label="Flown AWBs" value={String(flownBookings)} icon={<Calendar className="h-5 w-5" />} accent="success" />
          <MiniStat label="Booked revenue" value={formatMoney(bookedRevenue)} icon={<TrendingUp className="h-5 w-5" />} accent="brand" />
        </section>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Contract flight load</p>
                <p className="text-xs text-ink-muted">{formatNumber(bookedKg)} kg currently attributed to awarded routes.</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  className="h-10 w-full rounded-lg border border-border-ui bg-surface px-3 pl-9 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                  placeholder="Search flight, AWB, customer or route..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredFlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-ui py-16 text-center">
            <Plane className="h-10 w-10 text-ink-muted/40" />
            <p className="mt-3 text-sm font-semibold text-ink-muted">No booked contract flights found.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/gsa/quotes">Create quote for assigned route</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredFlights.map((flight) => (
              <Card key={flight.id} className="overflow-hidden">
                <div className={`h-1 ${flight.status === "cancelled" ? "bg-danger" : flight.status === "flown" ? "bg-success" : "bg-warning"}`} />
                <CardHeader className="pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-lg font-bold text-ink">{flight.flightNo}</span>
                        <Badge variant={flight.status === "cancelled" ? "danger" : flight.status === "flown" ? "success" : "warning"}>{flight.status}</Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-ink">
                        {flight.origin}
                        <ArrowRight className="h-3 w-3 text-ink-muted" />
                        {flight.destination}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-ink">{formatDate(flight.flightDate)}</p>
                      <p className="mt-0.5 text-[11px] text-ink-muted">{flight.aircraft}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-3">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <FlightMetric label="Weight" value={`${formatNumber(flight.bookedKg)} kg`} />
                    <FlightMetric label="Pieces" value={String(flight.pieces)} />
                    <FlightMetric label="Revenue" value={formatMoney(flight.revenue)} />
                  </div>
                  <div className="rounded-lg border border-border-ui bg-surface2 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">AWBs</p>
                    <p className="mt-1 font-mono text-xs text-ink">{flight.awbNumbers.join(", ")}</p>
                    <p className="mt-1 truncate text-xs text-ink-muted">{flight.customers.join(", ")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href="/gsa/shipments">
                        <FileText className="h-3.5 w-3.5" />
                        Shipments
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/gsa/cargo-workspace?origin=${flight.origin}&destination=${flight.destination}&flight=${flight.flightNo}&date=${flight.flightDate}`}>
                        Quote lane
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Assigned route coverage</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border-ui bg-surface2 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  {["Airline", "Route", "Frequency", "Operating days", "Aircraft", "Booked kg"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ui">
                {routes.map((route) => {
                  const routeBookedKg = bookings
                    .filter((booking) => booking.routeId === route.id || (booking.origin === route.origin && booking.destination === route.destination))
                    .reduce((sum, booking) => sum + (booking.flownWeightKg ?? booking.bookedWeightKg ?? booking.weightKg), 0);
                  return (
                    <tr key={`${route.contractId}-${route.id}`}>
                      <td className="px-4 py-3 font-semibold text-ink">{route.airline}</td>
                      <td className="px-4 py-3 font-mono text-ink">{route.origin} - {route.destination}</td>
                      <td className="px-4 py-3 text-ink-muted">{route.frequencyPerWeek}/week</td>
                      <td className="px-4 py-3 text-ink-muted">{route.operatingDays ?? route.weekday ?? "-"}</td>
                      <td className="px-4 py-3 text-ink-muted">{route.aircraft ?? "-"}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{formatNumber(routeBookedKg)} kg</td>
                    </tr>
                  );
                })}
                {routes.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-muted">No assigned contract routes yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function buildFlights(bookings: MandateBooking[], routes: AssignedRoute[]): FlightCard[] {
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const rows = new Map<string, FlightCard>();

  for (const booking of bookings) {
    const route = booking.routeId ? routeById.get(booking.routeId) : undefined;
    const flightNo = booking.flightNumber?.trim() || "Unassigned";
    const key = `${flightNo}-${booking.flightDate}-${booking.origin}-${booking.destination}`;
    const row = rows.get(key) ?? {
      id: key,
      flightNo,
      origin: booking.origin,
      destination: booking.destination,
      flightDate: booking.flightDate,
      aircraft: route?.aircraft ?? "-",
      bookedKg: 0,
      pieces: 0,
      revenue: 0,
      status: booking.status,
      awbNumbers: [],
      customers: [],
    };
    row.bookedKg += booking.flownWeightKg ?? booking.bookedWeightKg ?? booking.weightKg;
    row.pieces += booking.pieces;
    row.revenue += booking.finalRevenueAmount ?? booking.bookedRevenueAmount ?? booking.revenueAmount;
    row.status = combineBookingStatus(row.status, booking.status);
    row.awbNumbers.push(booking.awbNumber);
    if (!row.customers.includes(booking.customer)) row.customers.push(booking.customer);
    rows.set(key, row);
  }

  return Array.from(rows.values()).sort((left, right) => left.flightDate.localeCompare(right.flightDate));
}

function combineBookingStatus(current: MandateBooking["status"], next: MandateBooking["status"]) {
  if (current === "cancelled" || next === "cancelled") return "cancelled";
  if (current === "booked" || next === "booked") return "booked";
  return "flown";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
}

function formatMoney(value: number) {
  return `EUR ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function MiniStat({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: "brand" | "success" | "warning" }) {
  const color = accent === "brand" ? "text-brand" : accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-ink";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface2 text-ink-muted">{icon}</div>
        <div>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FlightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
