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
  airborne: { label: "Airborne", variant: "default", dot: "bg-cyan-400 animate-pulse" },
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
                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold">{item.value}</p>
                  </div>
                  <div className="rounded-md bg-cyan-50 p-2 text-cyan-600">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">{item.sub}</p>
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
              <Plane className="h-5 w-5 text-cyan-400" />
              Fleet schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 text-left">Aircraft</th>
                  <th className="pb-3 text-left">Status</th>
                  <th className="pb-3 text-left">Flight</th>
                  <th className="pb-3 text-left min-w-[220px]">Route progress</th>
                  <th className="pb-3 text-left">Dep / ETA</th>
                  <th className="pb-3 text-left">Load factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {fleet.map((aircraft) => {
                  const cfg = statusConfig[aircraft.status];
                  return (
                    <tr key={aircraft.registration} className="align-top text-slate-300">
                      {/* Aircraft */}
                      <td className="py-4">
                        <p className="font-mono font-semibold text-white">{aircraft.registration}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{aircraft.type}</p>
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
                            <p className="font-semibold text-white">{aircraft.flightNumber}</p>
                            <p className="text-xs text-slate-500">{aircraft.tonnage?.toFixed(1)} t</p>
                          </>
                        )}
                        {aircraft.status === "ground" && (
                          <>
                            <p className="font-semibold text-white">{aircraft.nextFlight}</p>
                            <p className="text-xs text-slate-500">Scheduled</p>
                          </>
                        )}
                        {aircraft.status === "maintenance" && (
                          <p className="text-slate-500">—</p>
                        )}
                      </td>

                      {/* Route progress */}
                      <td className="py-4 pr-6">
                        {aircraft.status === "airborne" && (
                          <div>
                            <div className="mb-1.5 flex items-center justify-between text-xs">
                              <span className="font-mono text-slate-400">{aircraft.origin}</span>
                              <span className="text-cyan-300">{aircraft.progressPct}% en route</span>
                              <span className="font-mono text-slate-400">{aircraft.destination}</span>
                            </div>
                            <div className="relative h-1.5 w-full overflow-visible rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-cyan-500/60"
                                style={{ width: `${aircraft.progressPct}%` }}
                              />
                              {/* Plane icon at current position */}
                              <span
                                className="absolute -top-[7px] -translate-x-1/2 text-cyan-400"
                                style={{ left: `${aircraft.progressPct}%` }}
                              >
                                ✈
                              </span>
                            </div>
                          </div>
                        )}
                        {aircraft.status === "ground" && (
                          <div>
                            <p className="text-xs text-slate-400">{aircraft.nextRoute}</p>
                            <p className="mt-1 text-xs text-slate-500">Next departure: {aircraft.nextDeparture}</p>
                          </div>
                        )}
                        {aircraft.status === "maintenance" && (
                          <div>
                            <p className="text-xs text-amber-300">{aircraft.maintenanceNote}</p>
                            <p className="mt-1 text-xs text-slate-500">Est. return: {aircraft.maintenanceUntil}</p>
                          </div>
                        )}
                      </td>

                      {/* Dep / ETA */}
                      <td className="py-4">
                        {aircraft.status === "airborne" && (
                          <div className="space-y-0.5 text-xs">
                            <p className="text-slate-400">Dep <span className="text-slate-200">{aircraft.departed}</span></p>
                            <p className="text-slate-400">ETA <span className="text-slate-200">{aircraft.eta}</span></p>
                          </div>
                        )}
                        {aircraft.status === "ground" && (
                          <p className="text-xs text-slate-500">{aircraft.location}</p>
                        )}
                        {aircraft.status === "maintenance" && (
                          <p className="text-xs text-slate-500">{aircraft.location}</p>
                        )}
                      </td>

                      {/* Load factor */}
                      <td className="py-4">
                        {aircraft.loadFactor != null ? (
                          <div>
                            <p className={`font-semibold ${aircraft.loadFactor >= 80 ? "text-emerald-400" : aircraft.loadFactor >= 65 ? "text-amber-400" : "text-rose-400"}`}>
                              {aircraft.loadFactor}%
                            </p>
                            <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={`h-full rounded-full ${aircraft.loadFactor >= 80 ? "bg-emerald-400" : aircraft.loadFactor >= 65 ? "bg-amber-400" : "bg-rose-400"}`}
                                style={{ width: `${aircraft.loadFactor}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
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
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="mt-1 text-xl font-semibold text-white">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

      </main>
    </>
  );
}
