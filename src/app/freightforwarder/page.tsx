import Link from "next/link";
import { Clock, Package, PackageCheck, Weight } from "lucide-react";
import { FfShipmentMap, type FfShipment } from "@/components/dashboard/ff-shipment-map";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dummyFlights } from "@/lib/dummy-flight-data";

// Forwarder's own AWBs — flight IDs match dummyFlights exactly
const myShipments: FfShipment[] = [
  { awb: "235-12345678", flightId: "flight-003", weightKg: 2340, product: "Pharma", status: "in-transit", eta: "May 7, 2026 06:40" },
  { awb: "235-98765432", flightId: "flight-004", weightKg: 560,  product: "High Value", status: "in-transit", eta: "May 8, 2026 14:30" },
  { awb: "176-44556677", flightId: "flight-001", weightKg: 1280, product: "General Cargo", status: "delivered",  eta: "May 5, 2026 08:55" },
  { awb: "080-77889900", flightId: "flight-006", weightKg: 890,  product: "Perishables", status: "delayed",    eta: "May 9, 2026 17:55" },
  { awb: "074-11223344", flightId: "flight-008", weightKg: 3100, product: "Seafood", status: "booked",     eta: "May 12, 2026 22:15" },
];

// Only show flights this forwarder has cargo on
const myFlightIds = new Set(myShipments.map((s) => s.flightId));
const myFlights = dummyFlights.filter((f) => myFlightIds.has(f.id));

const recentAwbs = [
  { awb: "619-80012345", origin: "FRA", destination: "JED", airline: "Saudia Cargo",    flight: "SV804",  weightKg: 1840, product: "Pharma",        status: "in-transit", eta: "May 7, 2026" },
  { awb: "619-80098765", origin: "JED", destination: "HKG", airline: "Saudia Cargo",    flight: "SV813",  weightKg: 2100, product: "High Value",    status: "in-transit", eta: "May 8, 2026" },
  { awb: "235-12345678", origin: "FRA", destination: "DXB", airline: "Etihad Cargo",    flight: "EY768",  weightKg: 2340, product: "General Cargo", status: "delivered",  eta: "May 5, 2026" },
  { awb: "080-77889900", origin: "JED", destination: "JFK", airline: "Saudia Cargo",    flight: "SV809",  weightKg: 890,  product: "Perishables",  status: "delayed",    eta: "May 9, 2026" },
  { awb: "074-11223344", origin: "OSL", destination: "ICN", airline: "Qatar Cargo",     flight: "QR8001", weightKg: 3100, product: "Seafood",       status: "booked",     eta: "May 12, 2026" },
];

const statusVariant: Record<string, "success" | "warning" | "danger" | "default" | "muted"> = {
  "in-transit": "default",
  delivered:    "success",
  delayed:      "danger",
  booked:       "muted",
};

export default function FreightForwarderDashboard() {
  return (
    <>
      <Topbar title="My shipments" subtitle="Globalink Logistics GmbH" />
      <main className="space-y-6 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Active shipments"       value="5"       change="2 in transit right now"          icon={Package} />
          <KpiCard label="Total weight this month" value="8.17 t" change="+12% vs last month"              icon={Weight} />
          <KpiCard label="On-time rate"           value="87%"     change="4 of 5 shipments on schedule"    icon={PackageCheck} />
          <KpiCard label="Avg transit time"       value="2.3 days" change="−0.4 days vs 30-day avg"        icon={Clock} />
        </div>

        {/* Purpose-built FF map — no revenue, LF, product mix or GSA data */}
        <FfShipmentMap flights={myFlights} shipments={myShipments} />

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent AWBs</CardTitle>
            <Link href="/freightforwarder/tracking" className="text-xs font-semibold text-brand hover:underline">
              Track all →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-ui text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="pb-3 text-left">AWB</th>
                    <th className="pb-3 text-left">Route</th>
                    <th className="pb-3 text-left">Airline / Flight</th>
                    <th className="pb-3 text-left">Weight</th>
                    <th className="pb-3 text-left">Product</th>
                    <th className="pb-3 text-left">ETA</th>
                    <th className="pb-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-ui">
                  {recentAwbs.map((awb) => (
                    <tr key={awb.awb} className="text-ink-muted">
                      <td className="py-3 font-mono text-xs text-brand">{awb.awb}</td>
                      <td className="py-3 font-semibold text-ink">{awb.origin} → {awb.destination}</td>
                      <td className="py-3">
                        <p className="text-ink">{awb.airline}</p>
                        <p className="text-xs text-ink-muted">{awb.flight}</p>
                      </td>
                      <td className="py-3">{awb.weightKg.toLocaleString()} kg</td>
                      <td className="py-3">{awb.product}</td>
                      <td className="py-3">{awb.eta}</td>
                      <td className="py-3">
                        <Badge variant={statusVariant[awb.status]}>{awb.status}</Badge>
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
