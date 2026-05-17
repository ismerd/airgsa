"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Inbox, PackageCheck } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CapacityAlert, CapacityAlertRoute, CapacityAlertUrgency } from "@/lib/services/capacity-alert-store";

const urgencyConfig: Record<CapacityAlertUrgency, { label: string; variant: "muted" | "warning" | "danger"; border: string }> = {
  normal: { label: "Normal", variant: "muted", border: "border-border-ui" },
  urgent: { label: "Urgent", variant: "warning", border: "border-warning/40" },
  critical: { label: "Critical", variant: "danger", border: "border-danger/40" },
};

export default function GsaCapacityAlertsPage() {
  const [alerts, setAlerts] = useState<CapacityAlert[]>([]);
  const [routes, setRoutes] = useState<CapacityAlertRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/capacity-alerts", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Capacity alerts could not be loaded");
        if (active) {
          setAlerts(data.alerts ?? []);
          setRoutes(data.routes ?? []);
        }
      })
      .catch((err) => {
        if (active) setError((err as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const critical = alerts.filter((alert) => alert.urgency === "critical").length;
  const availableKg = alerts.reduce((sum, alert) => sum + alert.availableKg, 0);

  return (
    <>
      <Topbar title="Capacity Alerts" subtitle="Airline capacity pushes for your awarded routes" />
      <main className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-3">
          <Metric icon={<BellRing className="h-5 w-5" />} label="Active alerts" value={String(alerts.length)} />
          <Metric icon={<PackageCheck className="h-5 w-5" />} label="Open capacity" value={`${Math.round(availableKg).toLocaleString("en-GB")} kg`} />
          <Metric icon={<Inbox className="h-5 w-5" />} label="Critical" value={String(critical)} tone={critical ? "danger" : "success"} />
        </section>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-ink-muted">Loading capacity alerts...</CardContent>
          </Card>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <BellRing className="h-10 w-10 text-ink-muted/40" />
              <div>
                <p className="font-semibold text-ink">No active capacity alerts</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Airline alerts for your assigned contract routes will appear here.
                </p>
              </div>
              {routes.length > 0 && (
                <Button asChild variant="outline">
                  <Link href="/gsa/quotes">Quote assigned routes</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {alerts.map((alert) => {
              const urgency = urgencyConfig[alert.urgency];
              const filledPct = Math.round(((alert.totalCapacityKg - alert.availableKg) / alert.totalCapacityKg) * 100);
              return (
                <Card key={alert.id} className={urgency.border}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={urgency.variant}>{urgency.label}</Badge>
                          <Badge variant="muted">{alert.airline}</Badge>
                          <span className="text-xs text-ink-muted">{formatDateTime(alert.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-ink-muted">{alert.message}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {alert.routes.map((route) => (
                        <div key={route.key} className="rounded-lg border border-border-ui bg-surface2 p-3">
                          <div className="flex items-center gap-2 font-mono text-sm font-semibold text-ink">
                            {route.origin}
                            <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />
                            {route.destination}
                          </div>
                          <p className="mt-1 text-xs text-ink-muted">
                            {route.frequencyPerWeek}/week · {route.aircraft ?? "Aircraft TBC"} · {route.operatingDays ?? route.weekday ?? "days TBC"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="mb-1.5 flex justify-between text-xs text-ink-muted">
                        <span>{filledPct}% filled</span>
                        <span>{alert.availableKg.toLocaleString("en-GB")} kg open of {alert.totalCapacityKg.toLocaleString("en-GB")} kg</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface2">
                        <div className="h-full rounded-full bg-success" style={{ width: `${filledPct}%` }} />
                      </div>
                    </div>

                    <Button asChild size="sm">
                      <Link href="/gsa/quotes">Create quote for capacity</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function Metric({ icon, label, value, tone = "brand" }: { icon: React.ReactNode; label: string; value: string; tone?: "brand" | "success" | "danger" }) {
  const color = tone === "danger" ? "bg-danger-bg text-danger" : tone === "success" ? "bg-success-bg text-success" : "bg-brand-light text-brand";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-xl font-bold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
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
