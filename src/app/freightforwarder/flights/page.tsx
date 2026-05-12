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
  { flight: "SV803", airline: "Saudia Cargo",  origin: "JED", destination: "FRA", departure: "01:30", arrival: "07:10",  frequency: "Daily",     availableKg: 14200, ratePerKg: 2.64, status: "on-time" },
  { flight: "SV805", airline: "Saudia Cargo",  origin: "JED", destination: "LHR", departure: "02:45", arrival: "08:30",  frequency: "Daily",     availableKg: 9800,  ratePerKg: 2.71, status: "on-time" },
  { flight: "SV807", airline: "Saudia Cargo",  origin: "JED", destination: "CDG", departure: "03:00", arrival: "09:15",  frequency: "5x weekly", availableKg: 11200, ratePerKg: 2.68, status: "on-time" },
  { flight: "SV813", airline: "Saudia Cargo",  origin: "JED", destination: "HKG", departure: "22:00", arrival: "14:30+1", frequency: "4x weekly", availableKg: 18600, ratePerKg: 2.98, status: "on-time" },
  { flight: "SV809", airline: "Saudia Cargo",  origin: "JED", destination: "JFK", departure: "03:15", arrival: "11:45",  frequency: "Daily",     availableKg: 11400, ratePerKg: 3.26, status: "delayed" },
  { flight: "SV817", airline: "Saudia Cargo",  origin: "JED", destination: "BOM", departure: "04:10", arrival: "08:40",  frequency: "5x weekly", availableKg: 8200,  ratePerKg: 2.28, status: "on-time" },
  { flight: "EY6745", airline: "Etihad Cargo", origin: "AUH", destination: "FRA", departure: "06:20", arrival: "11:05",  frequency: "Daily",     availableKg: 3200,  ratePerKg: 2.41, status: "on-time" },
  { flight: "QR8301", airline: "Qatar Cargo",  origin: "DOH", destination: "MAN", departure: "10:40", arrival: "15:30",  frequency: "3x weekly", availableKg: 2700,  ratePerKg: 2.33, status: "on-time" },
  { flight: "MS768",  airline: "Egyptair Cargo", origin: "CAI", destination: "LHR", departure: "11:55", arrival: "15:40", frequency: "4x weekly", availableKg: 2100, ratePerKg: 2.19, status: "on-time" },
  { flight: "SV815",  airline: "Saudia Cargo",  origin: "JED", destination: "NRT", departure: "23:30", arrival: "17:00+1", frequency: "3x weekly", availableKg: 5400, ratePerKg: 3.04, status: "on-time" },
];

const statusVariant: Record<string, "success" | "warning" | "danger"> = {
  "on-time": "success",
  delayed: "warning",
  cancelled: "danger",
};

const airlineColor: Record<string, string> = {
  "Saudia Cargo":    "#006241",
  "Etihad Cargo":    "#C5A028",
  "Qatar Cargo":     "#5C0632",
  "Egyptair Cargo":  "#00497C",
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
              { label: "On-time today", value: "9 / 10" },
              { label: "Total capacity (est.)", value: "104.8 t" },
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
