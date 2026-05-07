"use client";

import { useState } from "react";
import { BellRing, CheckCircle2, Zap } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { notifications } from "@/lib/services/platform";

type HuntAlert = {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  date: string;
  availableKg: number;
  totalKg: number;
  urgency: "urgent" | "critical";
  message: string;
  daysToDepart: number;
  receivedAt: string;
};

const huntAlerts: HuntAlert[] = [
  {
    id: "hunt-001",
    airline: "AeroBridge Cargo",
    flightNumber: "ABR332",
    origin: "VIE",
    destination: "DOH",
    date: "May 8, 2026",
    availableKg: 8200,
    totalKg: 52000,
    urgency: "urgent",
    message: "Short-haul VIE–DOH has significant belly capacity remaining. Any product mix accepted. Please push to your forwarder contacts immediately.",
    daysToDepart: 2,
    receivedAt: "09:14",
  },
  {
    id: "hunt-002",
    airline: "AeroBridge Cargo",
    flightNumber: "ABR744",
    origin: "BCN",
    destination: "MEX",
    date: "May 9, 2026",
    availableKg: 12400,
    totalKg: 78000,
    urgency: "critical",
    message: "BCN–MEX has critical low load. Priority: perishables, e-commerce. Rate flexibility available for volume bookings above 500 kg.",
    daysToDepart: 3,
    receivedAt: "11:30",
  },
];

const urgencyStyle = {
  urgent: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/5",
    dot: "bg-amber-400",
    badge: "warning" as const,
  },
  critical: {
    border: "border-rose-500/50",
    bg: "bg-rose-500/5",
    dot: "bg-rose-500",
    badge: "danger" as const,
  },
};

export default function NotificationsPage() {
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  function startHunt(id: string) {
    setActioned((prev) => new Set(prev).add(id));
  }

  const pendingHunts = huntAlerts.filter((a) => !actioned.has(a.id)).length;

  return (
    <>
      <Topbar title="Notifications" subtitle="Opportunity and workflow updates" />
      <main className="space-y-5 p-5">

        {/* Capacity hunt section */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-ink">Capacity hunts</p>
            {pendingHunts > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {pendingHunts}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {huntAlerts.map((alert) => {
              const style = urgencyStyle[alert.urgency];
              const isActioned = actioned.has(alert.id);
              const filledPct = Math.round(((alert.totalKg - alert.availableKg) / alert.totalKg) * 100);

              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-5 transition-opacity ${style.border} ${style.bg} ${isActioned ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot} ${!isActioned ? "animate-pulse" : ""}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={style.badge}>
                            {alert.urgency === "critical" ? "Critical" : "Urgent"}
                          </Badge>
                          <span className="text-xs text-ink-muted">
                            from {alert.airline} · Today {alert.receivedAt}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-lg font-bold text-ink">{alert.flightNumber}</span>
                          <span className="text-ink-muted">·</span>
                          <span className="font-semibold text-ink">{alert.origin} → {alert.destination}</span>
                          <span className="text-ink-muted">·</span>
                          <span className="text-sm text-ink-muted">{alert.date}</span>
                        </div>

                        <div className="mt-2 flex items-baseline gap-1.5">
                          <span className={`text-2xl font-bold ${alert.urgency === "critical" ? "text-rose-500" : "text-amber-500"}`}>
                            {(alert.availableKg / 1000).toFixed(1)} t
                          </span>
                          <span className="text-sm text-ink-muted">
                            available · {(alert.totalKg / 1000).toFixed(0)} t total capacity
                          </span>
                        </div>

                        <div className="mt-2 w-full max-w-xs">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${filledPct}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-ink-muted">
                            {filledPct}% filled · {100 - filledPct}% open
                          </p>
                        </div>

                        <p className="mt-3 text-sm text-ink-muted">{alert.message}</p>

                        <p className={`mt-2 text-xs font-semibold ${alert.daysToDepart <= 2 ? "text-rose-400" : "text-amber-400"}`}>
                          ⏱ {alert.daysToDepart} day{alert.daysToDepart !== 1 ? "s" : ""} to departure — act fast
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 self-start">
                      {isActioned ? (
                        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Hunt active
                        </div>
                      ) : (
                        <Button
                          onClick={() => startHunt(alert.id)}
                          className={
                            alert.urgency === "critical"
                              ? "bg-rose-600 text-white hover:bg-rose-700"
                              : "bg-amber-500 text-slate-950 hover:bg-amber-400"
                          }
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          Start cargo hunt
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regular notifications */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            All notifications
          </p>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={notification.status === "unread" ? "border-brand/30" : undefined}
              >
                <CardContent className="flex flex-col gap-2 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    {notification.status === "unread" && (
                      <span className="mb-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                    )}
                    <p className="font-semibold text-ink">{notification.title}</p>
                    <p className="mt-1 text-sm text-ink-muted">{notification.body}</p>
                  </div>
                  <p className="shrink-0 text-sm text-ink-muted">{notification.time}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </main>
    </>
  );
}
