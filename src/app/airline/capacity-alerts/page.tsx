"use client";

import { useState } from "react";
import { BellRing, CheckCircle2, Send, Trash2, X } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Urgency = "normal" | "urgent" | "critical";

type CapacityAlert = {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  date: string;
  availableKg: number;
  totalCapacityKg: number;
  urgency: Urgency;
  message: string;
  sentTo: string;
  sentAt: string;
  status: "active" | "filled" | "recalled";
  responses: number;
};

const upcomingFlights = [
  { id: "ABR214", label: "ABR214 — FRA → DXB — May 8", totalKg: 95000, defaultAvail: 11400 },
  { id: "ABR601", label: "ABR601 — MUC → SIN — May 8", totalKg: 82000, defaultAvail: 15600 },
  { id: "ABR332", label: "ABR332 — VIE → DOH — May 8", totalKg: 52000, defaultAvail: 8200 },
  { id: "ABR744", label: "ABR744 — BCN → MEX — May 9", totalKg: 78000, defaultAvail: 12400 },
  { id: "ABR215", label: "ABR215 — FRA → DXB — May 9", totalKg: 95000, defaultAvail: 0 },
];

const gsaOptions = [
  "All GSA partners",
  "BlueWing Cargo Solutions",
  "Atlantic AirCargo Partners",
  "NordicLift Aviation Services",
];

const urgencyConfig: Record<Urgency, { label: string; variant: "muted" | "warning" | "danger"; border: string; bg: string }> = {
  normal: { label: "Normal", variant: "muted", border: "border-border-ui", bg: "" },
  urgent: { label: "Urgent", variant: "warning", border: "border-amber-500/30", bg: "bg-amber-500/5" },
  critical: { label: "Critical", variant: "danger", border: "border-rose-500/40", bg: "bg-rose-500/5" },
};

const initialAlerts: CapacityAlert[] = [
  {
    id: "cap-001",
    flightNumber: "ABR332",
    origin: "VIE",
    destination: "DOH",
    date: "May 8, 2026",
    availableKg: 8200,
    totalCapacityKg: 52000,
    urgency: "urgent",
    message: "Short-haul VIE–DOH has significant belly capacity remaining. Any product mix accepted. Please push to your forwarder contacts immediately.",
    sentTo: "BlueWing Cargo Solutions, NordicLift Aviation Services",
    sentAt: "May 6, 09:14",
    status: "active",
    responses: 1,
  },
  {
    id: "cap-002",
    flightNumber: "ABR744",
    origin: "BCN",
    destination: "MEX",
    date: "May 9, 2026",
    availableKg: 12400,
    totalCapacityKg: 78000,
    urgency: "critical",
    message: "BCN–MEX has critical low load. Priority: perishables, e-commerce. Rate flexibility available for volume bookings above 500 kg.",
    sentTo: "Atlantic AirCargo Partners",
    sentAt: "May 6, 11:30",
    status: "active",
    responses: 0,
  },
];

export default function CapacityAlertsPage() {
  const [alerts, setAlerts] = useState<CapacityAlert[]>(initialAlerts);
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);

  const [flight, setFlight] = useState("");
  const [availKg, setAvailKg] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("urgent");
  const [message, setMessage] = useState("");
  const [sentTo, setSentTo] = useState("All GSA partners");

  function sendAlert() {
    const f = upcomingFlights.find((x) => x.id === flight);
    if (!f || !availKg) return;

    const [fn, route, date] = f.label.split(" — ");
    const [orig, dest] = route.split(" → ");

    const newAlert: CapacityAlert = {
      id: `cap-${Date.now()}`,
      flightNumber: fn,
      origin: orig,
      destination: dest,
      date: date ?? "",
      availableKg: Number(availKg),
      totalCapacityKg: f.totalKg,
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
    setFlight("");
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
      <Topbar title="Capacity alerts" subtitle="AeroBridge Cargo" />
      <main className="p-5">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Header row */}
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

          {/* Success banner */}
          {sent && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Alert sent to {sentTo}. GSAs will see this in their notifications immediately.
              <button onClick={() => setSent(false)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <Card className="border-brand/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-brand" />
                  New capacity alert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Flight</label>
                    <Select value={flight} onChange={(e) => setFlight((e.target as HTMLSelectElement).value)}>
                      <option value="">Select flight</option>
                      {upcomingFlights.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Available capacity (kg)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 8200"
                      value={availKg}
                      onChange={(e) => setAvailKg(e.target.value)}
                    />
                  </div>
                </div>

                {/* Urgency buttons */}
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
                  <Button onClick={sendAlert} disabled={!flight || !availKg}>
                    <Send className="mr-2 h-4 w-4" />
                    Send alert now
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active alerts */}
          {active.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Active alerts</p>
              {active.map((alert) => {
                const cfg = urgencyConfig[alert.urgency];
                const loadedPct = Math.round(((alert.totalCapacityKg - alert.availableKg) / alert.totalCapacityKg) * 100);
                return (
                  <Card key={alert.id} className={`${cfg.border} ${cfg.bg}`}>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full ${alert.urgency === "critical" ? "bg-rose-500" : alert.urgency === "urgent" ? "bg-amber-400" : "bg-brand"}`} />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-ink">{alert.flightNumber}</span>
                              <span className="text-ink-muted">{alert.origin} → {alert.destination}</span>
                              <span className="text-ink-muted">·</span>
                              <span className="text-sm text-ink-muted">{alert.date}</span>
                              <Badge variant={cfg.variant}>{cfg.label}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-ink-muted">{alert.message}</p>
                            <p className="mt-2 text-xs text-ink-muted">
                              Sent to: <span className="text-ink">{alert.sentTo}</span>
                              {" · "}Sent at: {alert.sentAt}
                              {" · "}{alert.responses} GSA{alert.responses !== 1 ? "s" : ""} responded
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => recallAlert(alert.id)}
                          className="shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface2 hover:text-ink"
                          title="Recall alert"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Capacity bar */}
                      <div className="mt-4">
                        <div className="mb-1.5 flex justify-between text-xs text-ink-muted">
                          <span>Capacity filled</span>
                          <span>
                            <span className="font-semibold text-ink">{alert.availableKg.toLocaleString()} kg</span> open of {alert.totalCapacityKg.toLocaleString()} kg total
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${loadedPct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-ink-muted">
                          <span>{loadedPct}% filled</span>
                          <span>{100 - loadedPct}% open</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Inactive / recalled alerts */}
          {inactive.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Past alerts</p>
              {inactive.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border-ui bg-surface px-4 py-3"
                >
                  <div className="flex items-center gap-3 text-sm text-ink-muted">
                    <span className="font-mono font-medium text-ink-muted">{alert.flightNumber}</span>
                    <span>{alert.origin} → {alert.destination}</span>
                    <span>·</span>
                    <span>{alert.date}</span>
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
