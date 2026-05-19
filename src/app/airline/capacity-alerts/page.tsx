"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, Send, Trash2, X } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CapacityAlert, CapacityAlertRoute, CapacityAlertUrgency } from "@/lib/services/capacity-alert-store";

const urgencyConfig: Record<CapacityAlertUrgency, { label: string; variant: "muted" | "warning" | "danger"; border: string; bg: string }> = {
  normal: { label: "Normal", variant: "muted", border: "border-border-ui", bg: "" },
  urgent: { label: "Urgent", variant: "warning", border: "border-amber-500/30", bg: "bg-amber-500/5" },
  critical: { label: "Critical", variant: "danger", border: "border-rose-500/40", bg: "bg-rose-500/5" },
};

type AlertForm = {
  routeKeys: string[];
  availableKg: string;
  totalCapacityKg: string;
  urgency: CapacityAlertUrgency;
  message: string;
  targetGsaCompanyId: string;
};

const emptyForm: AlertForm = {
  routeKeys: [],
  availableKg: "",
  totalCapacityKg: "",
  urgency: "urgent",
  message: "",
  targetGsaCompanyId: "",
};

export default function CapacityAlertsPage() {
  const [alerts, setAlerts] = useState<CapacityAlert[]>([]);
  const [routes, setRoutes] = useState<CapacityAlertRoute[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState<AlertForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setError(null);
    try {
      const res = await fetch("/api/capacity-alerts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Capacity alerts could not be loaded");
      setAlerts(data.alerts ?? []);
      setRoutes(data.routes ?? []);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const routeByKey = useMemo(() => new Map(routes.map((route) => [route.key, route])), [routes]);
  const selectedRoutes = form.routeKeys.map((key) => routeByKey.get(key)).filter(Boolean) as CapacityAlertRoute[];
  const selectedTargetRoutes = form.targetGsaCompanyId
    ? selectedRoutes.filter((route) => route.gsaCompanyId === form.targetGsaCompanyId)
    : selectedRoutes;
  const gsaOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const route of routes) {
      if (route.gsaCompanyId) options.set(route.gsaCompanyId, route.gsaName);
    }
    return Array.from(options.entries()).map(([id, name]) => ({ id, name }));
  }, [routes]);
  const active = alerts.filter((alert) => alert.status === "active");
  const inactive = alerts.filter((alert) => alert.status !== "active");

  function update<K extends keyof AlertForm>(key: K, value: AlertForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRoute(routeKey: string) {
    setForm((current) => ({
      ...current,
      routeKeys: current.routeKeys.includes(routeKey)
        ? current.routeKeys.filter((key) => key !== routeKey)
        : [...current.routeKeys, routeKey],
    }));
  }

  async function sendAlert() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/capacity-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeKeys: form.routeKeys,
          availableKg: Number(form.availableKg),
          totalCapacityKg: Number(form.totalCapacityKg),
          urgency: form.urgency,
          message: form.message,
          targetGsaCompanyId: form.targetGsaCompanyId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Capacity alert could not be sent");
      setSent(true);
      setShowForm(false);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function recallAlert(id: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/capacity-alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "recalled" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Capacity alert could not be recalled");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="Capacity alerts" subtitle="Persistent route capacity pushes to awarded GSAs" />
      <main className="p-5">
        <div className="mx-auto max-w-4xl space-y-6">
          {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {active.length > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                  {active.length}
                </span>
              )}
              <p className="text-sm text-ink-muted">
                {active.length} active alert{active.length !== 1 ? "s" : ""} sent to awarded GSA partners
              </p>
            </div>
            <Button onClick={() => { setShowForm(!showForm); setSent(false); }}>
              <BellRing className="mr-2 h-4 w-4" />
              Send capacity alert
            </Button>
          </div>

          {sent && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Alert sent. Visible GSAs can now see it through the capacity alert API.
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
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">Assigned contract routes</label>
                    <span className="text-xs text-ink-muted">{form.routeKeys.length} selected</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {routes.map((route) => {
                      const checked = form.routeKeys.includes(route.key);
                      return (
                        <label
                          key={route.key}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                            checked ? "border-brand bg-brand-light" : "border-border-ui bg-surface2 hover:border-brand/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRoute(route.key)}
                            className="mt-1 h-4 w-4 accent-[var(--brand)]"
                          />
                          <span className="min-w-0">
                            <span className="block font-mono text-sm font-semibold text-ink">{route.origin} - {route.destination}</span>
                            <span className="block text-xs text-ink-muted">{route.gsaName}</span>
                            <span className="mt-1 block text-[11px] text-ink-muted">
                              {route.frequencyPerWeek}/week - {route.aircraft ?? "Aircraft TBC"} - {route.operatingDays ?? route.weekday ?? "days TBC"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                    {routes.length === 0 && <p className="text-sm text-ink-muted">No assigned routes available. Award and assign contract routes first.</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Available capacity kg">
                    <Input type="number" value={form.availableKg} onChange={(event) => update("availableKg", event.target.value)} />
                  </Field>
                  <Field label="Total affected capacity kg">
                    <Input type="number" value={form.totalCapacityKg} onChange={(event) => update("totalCapacityKg", event.target.value)} />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Urgency">
                    <Select value={form.urgency} onChange={(event) => update("urgency", event.target.value as CapacityAlertUrgency)}>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                    </Select>
                  </Field>
                  <Field label="Send to">
                    <Select value={form.targetGsaCompanyId} onChange={(event) => update("targetGsaCompanyId", event.target.value)}>
                      <option value="">GSAs on selected routes</option>
                      {gsaOptions.map((gsa) => <option key={gsa.id} value={gsa.id}>{gsa.name}</option>)}
                    </Select>
                  </Field>
                </div>

                {form.targetGsaCompanyId && selectedTargetRoutes.length === 0 && (
                  <div className="rounded-lg border border-warning/25 bg-warning-bg p-3 text-sm text-warning">
                    Select at least one route assigned to this GSA.
                  </div>
                )}

                <Field label="Message to GSAs">
                  <textarea
                    rows={3}
                    placeholder="Describe the capacity situation, product priorities and rate flexibility..."
                    value={form.message}
                    onChange={(event) => update("message", event.target.value)}
                    className="w-full rounded-md border border-border-ui bg-surface2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-0"
                  />
                </Field>

                <div className="flex gap-3">
                  <Button onClick={sendAlert} disabled={saving || form.routeKeys.length === 0 || !form.availableKg || !form.totalCapacityKg || !form.message}>
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
              {active.map((alert) => <AlertCard key={alert.id} alert={alert} saving={saving} onRecall={recallAlert} />)}
            </div>
          )}

          {inactive.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Past alerts</p>
              {inactive.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between gap-4 rounded-lg border border-border-ui bg-surface px-4 py-3">
                  <div className="min-w-0 text-sm text-ink-muted">
                    <span className="font-mono font-medium text-ink-muted">{formatRoutes(alert.routes)}</span>
                    <span className="mx-2">-</span>
                    <span>{alert.sentTo}</span>
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

function AlertCard({ alert, saving, onRecall }: { alert: CapacityAlert; saving: boolean; onRecall: (id: string) => void }) {
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
                <span className="font-semibold text-ink">{formatRoutes(alert.routes)}</span>
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {alert.routes.map((route) => (
                  <span key={route.key} className="rounded-md border border-border-ui bg-surface px-2 py-1 text-xs text-ink-muted">
                    <span className="font-mono font-semibold text-ink">{route.origin} - {route.destination}</span>
                    {" "}- {route.gsaName} - {route.frequencyPerWeek}/week
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-ink-muted">{alert.message}</p>
              <p className="mt-2 text-xs text-ink-muted">
                Sent to: <span className="text-ink">{alert.sentTo}</span>
                {" - "}Sent at: {formatDateTime(alert.createdAt)}
                {" - "}{alert.responses} GSA{alert.responses !== 1 ? "s" : ""} responded
              </p>
            </div>
          </div>
          <button
            onClick={() => onRecall(alert.id)}
            disabled={saving}
            className="shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface2 hover:text-ink disabled:opacity-50"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>{children}</label>;
}

function formatRoutes(routes: CapacityAlertRoute[]) {
  const values = Array.from(new Set(routes.map((route) => `${route.origin}-${route.destination}`)));
  return values.join(", ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}
