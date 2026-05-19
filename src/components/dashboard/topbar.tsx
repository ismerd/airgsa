"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck, Search } from "lucide-react";
import { CommandAssistant } from "@/components/dashboard/command-assistant";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  getAirlineApplicationsForNotifications,
  getAirlineApplicationSeenState,
  isUnreadAirlineApplication,
  markAirlineApplicationsSeen,
  subscribeToAirlineApplicationsSeen,
} from "@/lib/client-notification-state";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  workflowId?: string;
  tenderId?: string;
};

type WorkflowNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  readAt?: string;
};

type GsaTenderSeenState = {
  seenTenderIds: Record<string, number>;
};

export function Topbar({
  title,
  subtitle,
  belowBar,
}: {
  title: string;
  subtitle: string;
  belowBar?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isAirline = pathname.startsWith("/airline");

  useEffect(() => {
    function close(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/airline/applications")) {
      markAirlineApplicationsSeen().catch(() => undefined);
      setNotifications([]);
      setNotificationCount(0);
    }
  }, [pathname]);

  useEffect(() => {
    async function loadWorkflowNotifications(): Promise<NotificationItem[]> {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      return ((data.notifications ?? []) as WorkflowNotification[])
        .filter((item) => !item.readAt)
        .map((item) => ({
          id: `workflow-${item.id}`,
          workflowId: item.id,
          title: item.title,
          body: item.body,
          href: item.href,
        }));
    }

    async function loadGsaTenderSeenState(): Promise<GsaTenderSeenState> {
      const res = await fetch("/api/tenders/seen", { cache: "no-store" });
      if (!res.ok) return { seenTenderIds: {} };
      const data = await res.json();
      return { seenTenderIds: data.state?.seenTenderIds ?? {} };
    }

    if (isAirline) {
      let active = true;
      function loadAirlineNotifications() {
        if (pathname.startsWith("/airline/applications")) {
          setNotifications([]);
          setNotificationCount(0);
          return;
        }

        Promise.all([
          loadWorkflowNotifications(),
          getAirlineApplicationsForNotifications(),
          getAirlineApplicationSeenState(),
        ])
          .then(([workflowItems, applications, seenState]) => {
            if (!active) return;
            const applicationItems = applications
              .filter((item) => isUnreadAirlineApplication(item, seenState.lastSeenAt))
              .map((item) => ({
                id: item.id,
                title: `New application from ${item.gsaName}`,
                body: item.proposedCommission || "Review the submitted proposal.",
                href: `/airline/applications/${item.id}`,
              }));
            const items = [...workflowItems, ...applicationItems];
            setNotifications(items);
            setNotificationCount(items.length);
          })
          .catch(() => {
            if (active) setNotificationCount(0);
          });
      }

      loadAirlineNotifications();
      const unsubscribe = subscribeToAirlineApplicationsSeen(loadAirlineNotifications);
      return () => {
        active = false;
        unsubscribe();
      };
    }

    Promise.all([
      loadWorkflowNotifications(),
      fetch("/api/tenders").then((res) => (res.ok ? res.json() : null)),
      getAirlineApplicationsForNotifications(),
      loadGsaTenderSeenState(),
    ])
      .then(([workflowItems, tenderData, applications, seenState]) => {
        if (!tenderData) {
          setNotifications(workflowItems);
          setNotificationCount(workflowItems.length);
          return;
        }
        const appliedTenderIds = new Set(
          applications.map((application) => application.tenderId),
        );
        const tenderItems = (tenderData.tenders ?? [])
          .filter((tender: { id: string }) => !appliedTenderIds.has(tender.id))
          .filter((tender: { id: string }) => !seenState.seenTenderIds[tender.id])
          .map((tender: { id: string; title: string; airline: string; countryScope?: string }) => ({
            id: tender.id,
            tenderId: tender.id,
            title: tender.title,
            body: `${tender.airline} tender${tender.countryScope ? ` - ${tender.countryScope}` : ""}`,
            href: `/gsa/tenders/${tender.id}`,
          }));
        const items = [...workflowItems, ...tenderItems];
        setNotifications(items);
        setNotificationCount(items.length);
      })
      .catch(() => setNotificationCount(0));
  }, [isAirline, pathname]);

  return (
    <header className="sticky top-0 z-20 border-b border-border-ui bg-surface/90 px-6 py-4 shadow-[0_1px_12px_rgba(11,30,79,0.06)] backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">{subtitle}</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-ink">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden w-64 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input className="pl-9" placeholder="Search tenders, GSAs, lanes..." />
          </div>
          <ThemeToggle />
          <CommandAssistant />
          <div className="relative" ref={wrapperRef}>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className={`${buttonVariants({ variant: "ghost", size: "icon" })} relative`}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>
            {open && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border-ui bg-surface shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-border-ui px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Notifications</p>
                    <p className="text-xs text-ink-muted">{notificationCount} unread item{notificationCount === 1 ? "" : "s"}</p>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => dismissNotifications(notifications)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-brand transition hover:bg-brand-light"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-ink-muted">No new notifications.</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => {
                          dismissNotifications([item]);
                          setOpen(false);
                        }}
                        className={`block border-b border-border-ui px-4 py-3 transition-all duration-200 last:border-b-0 hover:bg-surface2 ${
                          dismissingIds.has(item.id) ? "translate-x-1 bg-surface2 opacity-45" : "translate-x-0 opacity-100"
                        }`}
                      >
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        <p className="mt-1 text-xs text-ink-muted">{item.body}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {belowBar && (
        <div className="mt-3 border-t border-border-ui pt-3">
          {belowBar}
        </div>
      )}
    </header>
  );

  function dismissNotifications(items: NotificationItem[]) {
    if (items.length === 0) return;
    const ids = new Set(items.map((item) => item.id));
    setDismissingIds((current) => new Set([...current, ...ids]));
    setNotificationCount((current) => Math.max(0, current - items.length));
    markVisibleNotificationsSeen(items, isAirline).catch(() => undefined);

    window.setTimeout(() => {
      setNotifications((current) => current.filter((item) => !ids.has(item.id)));
      setDismissingIds((current) => {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, 180);
  }
}

async function markVisibleNotificationsSeen(items: NotificationItem[], isAirline: boolean) {
  if (items.length === 0) return;
  const workflowIds = items.map((item) => item.workflowId).filter(Boolean);
  const tenderIds = items.map((item) => item.tenderId).filter(Boolean);

  const requests: Promise<unknown>[] = workflowIds.map((id) =>
    fetch(`/api/notifications/${id}`, { method: "PATCH" }),
  );

  if (isAirline && items.some((item) => !item.workflowId && !item.tenderId)) {
    requests.push(markAirlineApplicationsSeen());
  }

  if (!isAirline && tenderIds.length > 0) {
    requests.push(fetch("/api/tenders/seen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllSeenIds: tenderIds }),
    }));
  }

  await Promise.allSettled(requests);
}
