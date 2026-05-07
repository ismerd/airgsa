import { PlaneTakeoff } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FlightRow = {
  flight: string;
  airline: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  frequency: string;
  availableKg: number;
  ratePerKg: number;
  status: "on-time" | "delayed" | "cancelled";
};

const flights: FlightRow[] = [
  { flight: "ABR214", airline: "AeroBridge Cargo", origin: "FRA", destination: "DXB", departure: "23:15", arrival: "06:40+1", frequency: "Daily", availableKg: 4800, ratePerKg: 2.83, status: "on-time" },
  { flight: "ABR601", airline: "AeroBridge Cargo", origin: "MUC", destination: "SIN", departure: "22:00", arrival: "14:30+2", frequency: "5x weekly", availableKg: 6100, ratePerKg: 3.06, status: "on-time" },
  { flight: "ABR332", airline: "AeroBridge Cargo", origin: "VIE", destination: "DOH", departure: "02:30", arrival: "08:45", frequency: "4x weekly", availableKg: 3900, ratePerKg: 2.25, status: "on-time" },
  { flight: "TKC403", airline: "Turkish Cargo", origin: "IST", destination: "FRA", departure: "06:20", arrival: "08:55", frequency: "Daily", availableKg: 3200, ratePerKg: 2.31, status: "on-time" },
  { flight: "TKC711", airline: "Turkish Cargo", origin: "IST", destination: "MAD", departure: "10:40", arrival: "14:05", frequency: "3x weekly", availableKg: 2700, ratePerKg: 2.33, status: "delayed" },
  { flight: "NSA921", airline: "NorthStar Airways", origin: "MAD", destination: "JFK", departure: "14:20", arrival: "17:55", frequency: "Daily", availableKg: 2900, ratePerKg: 2.46, status: "on-time" },
  { flight: "NSA117", airline: "NorthStar Airways", origin: "LIS", destination: "ORD", departure: "11:55", arrival: "15:10", frequency: "5x weekly", availableKg: 2100, ratePerKg: 2.19, status: "on-time" },
  { flight: "PLC509", airline: "PolarLine Cargo", origin: "OSL", destination: "ICN", departure: "06:00", arrival: "22:15+1", frequency: "4x weekly", availableKg: 5400, ratePerKg: 3.01, status: "on-time" },
  { flight: "PLC778", airline: "PolarLine Cargo", origin: "CPH", destination: "PVG", departure: "08:30", arrival: "06:15+2", frequency: "3x weekly", availableKg: 4200, ratePerKg: 2.84, status: "cancelled" },
  { flight: "ABR744", airline: "AeroBridge Cargo", origin: "BCN", destination: "MEX", departure: "13:10", arrival: "19:45", frequency: "Weekly", availableKg: 3600, ratePerKg: 2.34, status: "on-time" },
];

const statusVariant: Record<string, "success" | "warning" | "danger"> = {
  "on-time": "success",
  delayed: "warning",
  cancelled: "danger",
};

const airlineColor: Record<string, string> = {
  "AeroBridge Cargo": "#00AEEF",
  "Turkish Cargo": "#E30613",
  "NorthStar Airways": "#8B5CF6",
  "PolarLine Cargo": "#2DD4BF",
};

export default function FlightsPage() {
  return (
    <>
      <Topbar title="Flights" subtitle="Freight Forwarder" />
      <main className="p-5">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Total routes", value: "10" },
              { label: "Airlines", value: "4" },
              { label: "On-time today", value: "8 / 10" },
              { label: "Total capacity", value: "38.9 t" },
            ].map((m) => (
              <Card key={m.label} className="bg-white text-slate-950">
                <CardContent className="p-5">
                  <p className="text-sm text-ink-muted">{m.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlaneTakeoff className="h-5 w-5 text-brand" />
                Scheduled flights
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-ui text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="pb-3 text-left">Flight</th>
                    <th className="pb-3 text-left">Route</th>
                    <th className="pb-3 text-left">Departure</th>
                    <th className="pb-3 text-left">Arrival</th>
                    <th className="pb-3 text-left">Frequency</th>
                    <th className="pb-3 text-left">Capacity</th>
                    <th className="pb-3 text-left">Rate / kg</th>
                    <th className="pb-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-ui">
                  {flights.map((f) => (
                    <tr key={f.flight} className="text-ink-muted">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: airlineColor[f.airline] ?? "#94a3b8" }}
                          />
                          <span className="font-mono font-semibold text-ink">{f.flight}</span>
                        </div>
                        <p className="mt-0.5 pl-4 text-xs text-ink-muted">{f.airline}</p>
                      </td>
                      <td className="py-3 font-semibold text-ink">{f.origin} → {f.destination}</td>
                      <td className="py-3">{f.departure}</td>
                      <td className="py-3">{f.arrival}</td>
                      <td className="py-3">{f.frequency}</td>
                      <td className="py-3">{f.availableKg.toLocaleString()} kg</td>
                      <td className="py-3">${f.ratePerKg.toFixed(2)}</td>
                      <td className="py-3">
                        <Badge variant={statusVariant[f.status]}>{f.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
