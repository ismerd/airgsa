import { Plane, PlaneTakeoff, Wrench } from "lucide-react";
import { FlightWorldMap } from "@/components/dashboard/flight-world-map";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dummyFlights, getFlightsForAirline } from "@/lib/dummy-flight-data";

type AircraftStatus = "airborne" | "ground" | "maintenance";

type Aircraft = {
  registration: string;
  type: string;
  status: AircraftStatus;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  departed?: string;
  eta?: string;
  progressPct?: number;
  loadFactor?: number;
  tonnage?: number;
  location?: string;
  nextFlight?: string;
  nextRoute?: string;
  nextDeparture?: string;
  maintenanceNote?: string;
  maintenanceUntil?: string;
};

const fleet: Aircraft[] = [
  {
    registration: "D-ABCA",
    type: "Boeing 777F",
    status: "airborne",
    flightNumber: "ABR214",
    origin: "FRA",
    destination: "DXB",
    departed: "23:15",
    eta: "06:40+1",
    progressPct: 58,
    loadFactor: 88,
    tonnage: 21.6,
  },
  {
    registration: "D-ABCB",
    type: "Boeing 777F",
    status: "airborne",
    flightNumber: "ABR601",
    origin: "MUC",
    destination: "SIN",
    departed: "22:00",
    eta: "14:30+2",
    progressPct: 41,
    loadFactor: 81,
    tonnage: 17.9,
  },
  {
    registration: "D-ABCC",
    type: "Boeing 747-8F",
    status: "airborne",
    flightNumber: "ABR332",
    origin: "VIE",
    destination: "DOH",
    departed: "02:30",
    eta: "08:45",
    progressPct: 72,
    loadFactor: 69,
    tonnage: 12.7,
  },
  {
    registration: "D-ABCD",
    type: "Boeing 747-8F",
    status: "airborne",
    flightNumber: "ABR744",
    origin: "BCN",
    destination: "MEX",
    departed: "13:10",
    eta: "19:45",
    progressPct: 63,
    loadFactor: 71,
    tonnage: 13.6,
  },
  {
    registration: "D-ABCE",
    type: "Airbus A330F",
    status: "ground",
    location: "FRA",
    nextFlight: "ABR215",
    nextRoute: "FRA → DXB",
    nextDeparture: "May 8, 23:15",
  },
  {
    registration: "D-ABCF",
    type: "Boeing 777F",
    status: "maintenance",
    location: "MUC",
    maintenanceNote: "C-check service",
    maintenanceUntil: "May 9, 2026",
  },
];

const statusConfig: Record<AircraftStatus, { label: string; variant: "default" | "muted" | "warning"; dot: string }> = {
  airborne: { label: "Airborne", variant: "default", dot: "bg-brand animate-pulse" },
  ground: { label: "On ground", variant: "muted", dot: "bg-slate-400" },
  maintenance: { label: "Maintenance", variant: "warning", dot: "bg-amber-400" },
};

const airborne = fleet.filter((a) => a.status === "airborne");
const onGround = fleet.filter((a) => a.status === "ground");
const inMaintenance = fleet.filter((a) => a.status === "maintenance");
const avgLf = Math.round(airborne.reduce((s, a) => s + (a.loadFactor ?? 0), 0) / airborne.length);
const totalTonnage = airborne.reduce((s, a) => s + (a.tonnage ?? 0), 0);

const trackedFlights = getFlightsForAirline(dummyFlights, {
  airlineName: "AeroBridge Cargo",
  salesTeams: ["AeroBridge DACH Sales", "AeroBridge Austria Desk"],
});

export default function FleetPage() {
  return (
    <>
      <Topbar title="Fleet overview" subtitle="AeroBridge Cargo" />
      <main className="space-y-6 p-5">

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total fleet", value: String(fleet.length), sub: "6 registered aircraft", icon: Plane },
            { label: "Airborne", value: String(airborne.length), sub: `${totalTonnage.toFixed(1)} t in the air`, icon: PlaneTakeoff },
            { label: "On ground", value: String(onGround.length), sub: onGround.map((a) => a.location).join(", "), icon: Plane },
            { label: "Maintenance", value: String(inMaintenance.length), sub: inMaintenance[0]?.maintenanceNote ?? "–", icon: Wrench },
          ].map((item) => (
            <Card key={item.label} className="bg-white text-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold">{item.value}</p>
                  </div>
                  <div className="rounded-md bg-brand-light p-2 text-brand">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-ink-muted">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Live map */}
        <FlightWorldMap
          title="Live fleet positions"
          subtitle="AeroBridge Cargo aircraft currently airborne. Click an aircraft for flight details."
          flights={trackedFlights}
          markerColorMode="airline"
        />

        {/* Fleet schedule table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-brand" />
              Fleet schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-ui text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-3 text-left">Aircraft</th>
                  <th className="pb-3 text-left">Status</th>
                  <th className="pb-3 text-left">Flight</th>
                  <th className="pb-3 text-left min-w-[220px]">Route progress</th>
                  <th className="pb-3 text-left">Dep / ETA</th>
                  <th className="pb-3 text-left">Load factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ui">
                {fleet.map((aircraft) => {
                  const cfg = statusConfig[aircraft.status];
                  return (
                    <tr key={aircraft.registration} className="align-top text-ink-muted">
                      {/* Aircraft */}
                      <td className="py-4">
                        <p className="font-mono font-semibold text-ink">{aircraft.registration}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{aircraft.type}</p>
                      </td>

                      {/* Status */}
                      <td className="py-4">
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </span>
                      </td>

                      {/* Flight */}
                      <td className="py-4">
                        {aircraft.status === "airborne" && (
                          <>
                            <p className="font-semibold text-ink">{aircraft.flightNumber}</p>
                            <p className="text-xs text-ink-muted">{aircraft.tonnage?.toFixed(1)} t</p>
                          </>
                        )}
                        {aircraft.status === "ground" && (
                          <>
                            <p className="font-semibold text-ink">{aircraft.nextFlight}</p>
                            <p className="text-xs text-ink-muted">Scheduled</p>
                          </>
                        )}
                        {aircraft.status === "maintenance" && (
                          <p className="text-ink-muted">—</p>
                        )}
                      </td>

                      {/* Route progress */}
                      <td className="py-4 pr-6">
                        {aircraft.status === "airborne" && (
                          <div>
                            <div className="mb-1.5 flex items-center justify-between text-xs">
                              <span className="font-mono text-ink-muted">{aircraft.origin}</span>
                              <span className="text-brand">{aircraft.progressPct}% en route</span>
                              <span className="font-mono text-ink-muted">{aircraft.destination}</span>
                            </div>
                            <div className="relative h-1.5 w-full overflow-visible rounded-full bg-black/10">
                              <div
                                className="h-full rounded-full bg-cyan-500/60"
                                style={{ width: `${aircraft.progressPct}%` }}
                              />
                              {/* Plane icon at current position */}
                              <span
                                className="absolute -top-[7px] -translate-x-1/2 text-brand"
                                style={{ left: `${aircraft.progressPct}%` }}
                              >
                                ✈
                              </span>
                            </div>
                          </div>
                        )}
                        {aircraft.status === "ground" && (
                          <div>
                            <p className="text-xs text-ink-muted">{aircraft.nextRoute}</p>
                            <p className="mt-1 text-xs text-ink-muted">Next departure: {aircraft.nextDeparture}</p>
                          </div>
                        )}
                        {aircraft.status === "maintenance" && (
                          <div>
                            <p className="text-xs text-amber-600">{aircraft.maintenanceNote}</p>
                            <p className="mt-1 text-xs text-ink-muted">Est. return: {aircraft.maintenanceUntil}</p>
                          </div>
                        )}
                      </td>

                      {/* Dep / ETA */}
                      <td className="py-4">
                        {aircraft.status === "airborne" && (
                          <div className="space-y-0.5 text-xs">
                            <p className="text-ink-muted">Dep <span className="text-ink">{aircraft.departed}</span></p>
                            <p className="text-ink-muted">ETA <span className="text-ink">{aircraft.eta}</span></p>
                          </div>
                        )}
                        {aircraft.status === "ground" && (
                          <p className="text-xs text-ink-muted">{aircraft.location}</p>
                        )}
                        {aircraft.status === "maintenance" && (
                          <p className="text-xs text-ink-muted">{aircraft.location}</p>
                        )}
                      </td>

                      {/* Load factor */}
                      <td className="py-4">
                        {aircraft.loadFactor != null ? (
                          <div>
                            <p className={`font-semibold ${aircraft.loadFactor >= 80 ? "text-emerald-400" : aircraft.loadFactor >= 65 ? "text-amber-400" : "text-rose-400"}`}>
                              {aircraft.loadFactor}%
                            </p>
                            <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-black/10">
                              <div
                                className={`h-full rounded-full ${aircraft.loadFactor >= 80 ? "bg-emerald-400" : aircraft.loadFactor >= 65 ? "bg-amber-400" : "bg-rose-400"}`}
                                style={{ width: `${aircraft.loadFactor}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Avg fleet stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Avg load factor (airborne)", value: `${avgLf}%` },
            { label: "Total tonnage in transit", value: `${totalTonnage.toFixed(1)} t` },
            { label: "Flights today", value: String(airborne.length) },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs text-ink-muted">{s.label}</p>
                <p className="mt-1 text-xl font-semibold text-ink">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

      </main>
    </>
  );
}
