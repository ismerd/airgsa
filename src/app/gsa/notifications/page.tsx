"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WorkflowNotification } from "@/lib/services/mandate-execution-store";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setError(null);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Notifications could not be loaded");
      setNotifications(payload.notifications ?? []);
    } catch (err) {
      setError((err as Error).message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Notification could not be updated");
      setNotifications((current) => current.map((item) => item.id === id ? payload.notification : item));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function markAllRead() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Notifications could not be updated");
      setNotifications(payload.notifications ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <>
      <Topbar title="Notifications" subtitle="Workflow updates from airline partners" />
      <main className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-brand" />
            <p className="text-sm font-semibold text-ink">Workflow notifications</p>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" disabled={saving || unreadCount === 0} onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-ink-muted">Loading notifications...</CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <Inbox className="h-10 w-10 text-ink-muted/40" />
              <div>
                <p className="font-semibold text-ink">No workflow notifications</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Airline control actions, monthly report reviews, campaigns and quote updates will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card key={notification.id} className={!notification.readAt ? "border-brand/40" : ""}>
                <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={!notification.readAt ? "success" : "muted"}>{notification.readAt ? "Read" : "Unread"}</Badge>
                      <Badge variant="muted">{notification.type}</Badge>
                      <span className="text-xs text-ink-muted">{formatDateTime(notification.createdAt)}</span>
                    </div>
                    <p className="mt-2 font-semibold text-ink">{notification.title}</p>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">{notification.body}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {!notification.readAt && (
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => markRead(notification.id)}>
                        <CheckCheck className="h-4 w-4" />
                        Mark read
                      </Button>
                    )}
                    <Button asChild size="sm">
                      <Link href={notification.href}>
                        Open
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
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
