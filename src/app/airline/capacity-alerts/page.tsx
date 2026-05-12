"use client";

import { useMemo, useState } from "react";
import { BellRing, CheckCircle2, Plane, Send, Trash2, X } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { realGsaPartners } from "@/lib/real-gsa-data";

type FlightType = "cargo" | "passenger";
type Urgency = "normal" | "urgent" | "critical";

type AlertFlight = {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  date: string;
  totalKg: number;
};

type CapacityAlert = {
  id: string;
  flights: AlertFlight[];
  flightType: FlightType;
  availableKg: number;
  totalCapacityKg: number;
  urgency: Urgency;
  message: string;
  sentTo: string;
  sentAt: string;
  status: "active" | "filled" | "recalled";
  responses: number;
};

const upcomingFlights: Array<AlertFlight & { label: string; flightType: FlightType; defaultAvail: number }> = [
  { id: "SV803", flightNumber: "SV803", origin: "JED", destination: "FRA", date: "May 8", totalKg: 108000, defaultAvail: 14200, flightType: "cargo", label: "SV803 - JED -> FRA - May 8" },
  { id: "SV813", flightNumber: "SV813", origin: "JED", destination: "HKG", date: "May 8", totalKg: 108000, defaultAvail: 18600, flightType: "cargo", label: "SV813 - JED -> HKG - May 8" },
  { id: "SV805", flightNumber: "SV805", origin: "JED", destination: "LHR", date: "May 8", totalKg: 108000, defaultAvail: 9800, flightType: "cargo", label: "SV805 - JED -> LHR - May 8" },
  { id: "SV809", flightNumber: "SV809", origin: "JED", destination: "JFK", date: "May 9", totalKg: 108000, defaultAvail: 11400, flightType: "cargo", label: "SV809 - JED -> JFK - May 9" },
  { id: "SV807", flightNumber: "SV807", origin: "JED", destination: "CDG", date: "May 9", totalKg: 108000, defaultAvail: 0, flightType: "cargo", label: "SV807 - JED -> CDG - May 9" },
  { id: "SV101", flightNumber: "SV101", origin: "JED", destination: "LGW", date: "May 8", totalKg: 18000, defaultAvail: 4200, flightType: "passenger", label: "SV101 - JED -> LGW - May 8" },
  { id: "SV127", flightNumber: "SV127", origin: "JED", destination: "CDG", date: "May 8", totalKg: 16000, defaultAvail: 3100, flightType: "passenger", label: "SV127 - JED -> CDG - May 8" },
  { id: "SV105", flightNumber: "SV105", origin: "JED", destination: "LHR", date: "May 9", totalKg: 19000, defaultAvail: 5500, flightType: "passenger", label: "SV105 - JED -> LHR - May 9" },
  { id: "SV227", flightNumber: "SV227", origin: "JED", destination: "MAD", date: "May 9", totalKg: 14000, defaultAvail: 2600, flightType: "passenger", label: "SV227 - JED -> MAD - May 9" },
];

const gsaOptions = [
  "All GSA partners",
  ...realGsaPartners.map((partner) => partner.name),
];

const urgencyConfig: Record<Urgency, { label: string; variant: "muted" | "warning" | "danger"; border: string; bg: string }> = {
  normal: { label: "Normal", variant: "muted", border: "border-border-ui", bg: "" },
  urgent: { label: "Urgent", variant: "warning", border: "border-amber-500/30", bg: "bg-amber-500/5" },
  critical: { label: "Critical", variant: "danger", border: "border-rose-500/40", bg: "bg-rose-500/5" },
};

const initialAlerts: CapacityAlert[] = [
  {
    id: "cap-001",
    flightType: "cargo",
    flights: [
      { id: "SV803", flightNumber: "SV803", origin: "JED", destination: "FRA", date: "May 8, 2026", totalKg: 108000 },
      { id: "SV805", flightNumber: "SV805", origin: "JED", destination: "LHR", date: "May 8, 2026", totalKg: 108000 },
    ],
    availableKg: 24000,
    totalCapacityKg: 216000,
    urgency: "urgent",
    message: "JED-Europe has significant capacity remaining on May 8 departures. All product types accepted. Push pharma, express, and general cargo to forwarder contacts immediately.",
    sentTo: `${realGsaPartners[0].name}, ${realGsaPartners[1].name}`,
    sentAt: "May 6, 09:14",
    status: "active",
    responses: 1,
  },
  {
    id: "cap-002",
    flightType: "cargo",
    flights: [
      { id: "SV813", flightNumber: "SV813", origin: "JED", destination: "HKG", date: "May 8, 2026", totalKg: 108000 },
    ],
    availableKg: 18600,
    totalCapacityKg: 108000,
    urgency: "critical",
    message: "JED-HKG May 8 has critical low load. Priority: high-value, pharma, e-commerce. Rate flexibility available for volume bookings above 1,000 kg.",
    sentTo: realGsaPartners[2].name,
    sentAt: "May 6, 11:30",
    status: "active",
    responses: 0,
  },
];

export default function CapacityAlertsPage() {
  const [alerts, setAlerts] = useState<CapacityAlert[]>(initialAlerts);
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);

  const [flightType, setFlightType] = useState<FlightType>("cargo");
  const [selectedFlightIds, setSelectedFlightIds] = useState<string[]>([]);
  const [availKg, setAvailKg] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("urgent");
  const [message, setMessage] = useState("");
  const [sentTo, setSentTo] = useState("All GSA partners");

  const selectableFlights = useMemo(
    () => upcomingFlights.filter((flight) => flight.flightType === flightType),
    [flightType]
  );

  const selectedFlights = useMemo(
    () => upcomingFlights.filter((flight) => selectedFlightIds.includes(flight.id)),
    [selectedFlightIds]
  );

  const suggestedAvailKg = selectedFlights.reduce((sum, flight) => sum + flight.defaultAvail, 0);
  const selectedTotalKg = selectedFlights.reduce((sum, flight) => sum + flight.totalKg, 0);

  function setType(nextType: FlightType) {
    setFlightType(nextType);
    setSelectedFlightIds([]);
    setAvailKg("");
  }

  function toggleFlight(flightId: string) {
    setSelectedFlightIds((current) => {
      const next = current.includes(flightId)
        ? current.filter((id) => id !== flightId)
        : [...current, flightId];

      const nextFlights = upcomingFlights.filter((flight) => next.includes(flight.id));
      setAvailKg(nextFlights.length > 0 ? String(nextFlights.reduce((sum, flight) => sum + flight.defaultAvail, 0)) : "");
      return next;
    });
  }

  function sendAlert() {
    if (selectedFlights.length === 0 || !availKg) return;

    const flights = selectedFlights.map(({ id, flightNumber, origin, destination, date, totalKg }) => ({
      id,
      flightNumber,
      origin,
      destination,
      date,
      totalKg,
    }));

    const newAlert: CapacityAlert = {
      id: `cap-${Date.now()}`,
      flights,
      flightType,
      availableKg: Number(availKg),
      totalCapacityKg: selectedTotalKg,
      urgency,
      message,
      sentTo,
      sentAt: "May 6, now",
      status: "active",
      responses: 0,
    };

    setAlerts((prev) => [newAlert, ...prev]);
    setSent(true);
    setShowForm(false);
    setFlightType("cargo");
    setSelectedFlightIds([]);
    setAvailKg("");
    setMessage("");
    setUrgency("urgent");
  }

  function recallAlert(id: string) {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "recalled" } : a));
  }

  const active = alerts.filter((a) => a.status === "active");
  const inactive = alerts.filter((a) => a.status !== "active");

  return (
    <>
      <Topbar title="Capacity alerts" subtitle="Saudia Cargo" />
      <main className="p-5">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {active.length > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                  {active.length}
                </span>
              )}
              <p className="text-sm text-ink-muted">
                {active.length} active alert{active.length !== 1 ? "s" : ""} sent to GSA partners
              </p>
            </div>
            <Button onClick={() => { setShowForm(!showForm); setSent(false); }}>
              <BellRing className="mr-2 h-4 w-4" />
              Send capacity alert
            </Button>
          </div>

          {sent && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Alert sent to {sentTo}. GSAs will see this in their notifications immediately.
              <button onClick={() => setSent(false)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {showForm && (
            <Card className="border-brand/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-brand" />
                  New capacity alert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-ink-muted">Flight type</label>
                  <div className="inline-flex rounded-lg border border-border-ui bg-surface2 p-1">
                    {(["cargo", "passenger"] as FlightType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setType(type)}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                          flightType === type
                            ? "bg-brand text-white"
                            : "text-ink-muted hover:bg-surface hover:text-ink"
                        }`}
                      >
                        <Plane className="h-3.5 w-3.5" />
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-xs font-semibold text-ink-muted">Flights / routes</label>
                    <span className="text-xs text-ink-muted">
                      {selectedFlightIds.length} selected
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectableFlights.map((flight) => {
                      const checked = selectedFlightIds.includes(flight.id);
                      return (
                        <label
                          key={flight.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                            checked
                              ? "border-brand bg-brand-light"
                              : "border-border-ui bg-surface2 hover:border-brand/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFlight(flight.id)}
                            className="mt-1 h-4 w-4 accent-[var(--brand)]"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink">{flight.flightNumber}</span>
                            <span className="block text-xs text-ink-muted">
                              {flight.origin} {"->"} {flight.destination} · {flight.date}
                            </span>
                            <span className="mt-1 block text-[11px] text-ink-muted">
                              {flight.defaultAvail.toLocaleString()} kg open · {flight.totalKg.toLocaleString()} kg total
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Available capacity (kg)</label>
                    <Input
                      type="number"
                      placeholder={suggestedAvailKg > 0 ? String(suggestedAvailKg) : "e.g. 8200"}
                      value={availKg}
                      onChange={(e) => setAvailKg(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Total selected capacity</label>
                    <div className="rounded-md border border-border-ui bg-surface2 px-3 py-2 text-sm text-ink">
                      {selectedTotalKg.toLocaleString()} kg
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-ink-muted">Urgency</label>
                  <div className="flex gap-2">
                    {(["normal", "urgent", "critical"] as Urgency[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUrgency(u)}
                        className={`rounded-md border px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                          urgency === u
                            ? u === "critical"
                              ? "border-rose-500 bg-rose-500/20 text-rose-600"
                              : u === "urgent"
                              ? "border-amber-500 bg-amber-500/20 text-amber-600"
                              : "border-brand bg-brand-light text-brand"
                            : "border-border-ui text-ink-muted hover:border-border-ui hover:text-ink"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Message to GSAs</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the capacity situation and any product mix priorities..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-md border border-border-ui bg-surface2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-0"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Send to</label>
                  <Select value={sentTo} onChange={(e) => setSentTo((e.target as HTMLSelectElement).value)}>
                    {gsaOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button onClick={sendAlert} disabled={selectedFlightIds.length === 0 || !availKg}>
                    <Send className="mr-2 h-4 w-4" />
                    Send alert now
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {active.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Active alerts</p>
              {active.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onRecall={recallAlert} />
              ))}
            </div>
          )}

          {inactive.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Past alerts</p>
              {inactive.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border-ui bg-surface px-4 py-3"
                >
                  <div className="min-w-0 text-sm text-ink-muted">
                    <span className="font-mono font-medium text-ink-muted">{formatFlightNumbers(alert.flights)}</span>
                    <span className="mx-2">·</span>
                    <span>{formatRoutes(alert.flights)}</span>
                  </div>
                  <Badge variant="muted">{alert.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function AlertCard({ alert, onRecall }: { alert: CapacityAlert; onRecall: (id: string) => void }) {
  const cfg = urgencyConfig[alert.urgency];
  const loadedPct = Math.round(((alert.totalCapacityKg - alert.availableKg) / alert.totalCapacityKg) * 100);

  return (
    <Card className={`${cfg.border} ${cfg.bg}`}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full ${alert.urgency === "critical" ? "bg-rose-500" : alert.urgency === "urgent" ? "bg-amber-400" : "bg-brand"}`} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{formatFlightNumbers(alert.flights)}</span>
                <Badge variant="muted">{alert.flightType}</Badge>
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {alert.flights.map((flight) => (
                  <span key={flight.id} className="rounded-md border border-border-ui bg-surface px-2 py-1 text-xs text-ink-muted">
                    <span className="font-mono font-semibold text-ink">{flight.flightNumber}</span>
                    {" "}{flight.origin} {"->"} {flight.destination} · {flight.date}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-ink-muted">{alert.message}</p>
              <p className="mt-2 text-xs text-ink-muted">
                Sent to: <span className="text-ink">{alert.sentTo}</span>
                {" · "}Sent at: {alert.sentAt}
                {" · "}{alert.responses} GSA{alert.responses !== 1 ? "s" : ""} responded
              </p>
            </div>
          </div>
          <button
            onClick={() => onRecall(alert.id)}
            className="shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface2 hover:text-ink"
            title="Recall alert"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-ink-muted">
            <span>Capacity filled</span>
            <span>
              <span className="font-semibold text-ink">{alert.availableKg.toLocaleString()} kg</span> open of {alert.totalCapacityKg.toLocaleString()} kg total
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${loadedPct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-ink-muted">
            <span>{loadedPct}% filled</span>
            <span>{100 - loadedPct}% open</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatFlightNumbers(flights: AlertFlight[]) {
  return flights.map((flight) => flight.flightNumber).join(", ");
}

function formatRoutes(flights: AlertFlight[]) {
  const routes = Array.from(new Set(flights.map((flight) => `${flight.origin}->${flight.destination}`)));
  return routes.join(", ");
}
