"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { LiveTenderApplication } from "@/lib/services/tender-workflow-store";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string;
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
    if (isAirline) {
      fetch("/api/applications")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          const items = ((data.applications ?? []) as LiveTenderApplication[])
            .filter((item) => item.status === "pending")
            .map((item) => ({
              id: item.id,
              title: `New application from ${item.gsaName}`,
              body: item.proposedCommission || "Review the submitted proposal.",
              href: `/airline/applications/${item.id}`,
            }));
          setNotifications(items);
          setNotificationCount(items.length);
        })
        .catch(() => setNotificationCount(0));
      return;
    }

    Promise.all([
      fetch("/api/tenders").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/applications").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([tenderData, applicationData]) => {
        if (!tenderData || !applicationData) return;
        const appliedTenderIds = new Set(
          ((applicationData.applications ?? []) as LiveTenderApplication[]).map((application) => application.tenderId),
        );
        const items = (tenderData.tenders ?? [])
          .filter((tender: { id: string }) => !appliedTenderIds.has(tender.id))
          .map((tender: { id: string; title: string; airline: string; countryScope?: string }) => ({
            id: tender.id,
            title: tender.title,
            body: `${tender.airline} tender${tender.countryScope ? ` - ${tender.countryScope}` : ""}`,
            href: `/gsa/tenders/${tender.id}`,
          }));
        setNotifications(items);
        setNotificationCount(items.length);
      })
      .catch(() => setNotificationCount(0));
  }, [isAirline]);

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
                <div className="border-b border-border-ui px-4 py-3">
                  <p className="text-sm font-semibold text-ink">Notifications</p>
                  <p className="text-xs text-ink-muted">{notificationCount} new item{notificationCount === 1 ? "" : "s"}</p>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-ink-muted">No new notifications.</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block border-b border-border-ui px-4 py-3 transition-colors last:border-b-0 hover:bg-surface2"
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
}
