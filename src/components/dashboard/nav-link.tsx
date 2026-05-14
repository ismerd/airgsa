"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  isUnreadAirlineApplication,
  markAirlineApplicationsSeen,
  subscribeToAirlineApplicationsSeen,
} from "@/lib/client-notification-state";
import { cn } from "@/lib/utils";
import type { LiveTenderApplication } from "@/lib/services/tender-workflow-store";

export function NavLink({ href, children, badgeCount }: { href: string; children: React.ReactNode; badgeCount?: number }) {
  const pathname = usePathname();
  const [clientBadgeCount, setClientBadgeCount] = useState(badgeCount ?? 0);
  const active =
    href === "/airline" || href === "/gsa" || href === "/admin"
      ? pathname === href
      : pathname.startsWith(href);
  const isAirlineApplicationsLink = href === "/airline/applications";
  const isAirlineApplicationsPage = pathname.startsWith("/airline/applications");
  const visibleBadgeCount = isAirlineApplicationsLink
    ? isAirlineApplicationsPage
      ? 0
      : clientBadgeCount
    : badgeCount;

  useEffect(() => {
    setClientBadgeCount(badgeCount ?? 0);
  }, [badgeCount]);

  useEffect(() => {
    if (!isAirlineApplicationsLink) return;

    async function refreshApplicationBadge() {
      if (isAirlineApplicationsPage) {
        markAirlineApplicationsSeen();
        setClientBadgeCount(0);
        return;
      }

      try {
        const res = await fetch("/api/applications");
        if (!res.ok) {
          setClientBadgeCount(0);
          return;
        }
        const data = await res.json();
        const unreadCount = ((data.applications ?? []) as LiveTenderApplication[]).filter(isUnreadAirlineApplication).length;
        setClientBadgeCount(unreadCount);
      } catch {
        setClientBadgeCount(0);
      }
    }

    refreshApplicationBadge();
    return subscribeToAirlineApplicationsSeen(refreshApplicationBadge);
  }, [isAirlineApplicationsLink, isAirlineApplicationsPage, pathname]);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-white/[0.16] text-white shadow-[inset_3px_0_0_var(--brand)] [&_svg]:text-brand"
          : "text-white/50 hover:bg-white/[0.06] hover:text-white/80 [&_svg]:text-white/35",
      )}
    >
      {children}
      {visibleBadgeCount != null && visibleBadgeCount > 0 && (
        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
          {visibleBadgeCount > 9 ? "9+" : visibleBadgeCount}
        </span>
      )}
    </Link>
  );
}
