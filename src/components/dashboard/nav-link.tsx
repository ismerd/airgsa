"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getAirlineApplicationsForNotifications,
  getAirlineApplicationSeenState,
  isUnreadAirlineApplication,
  markAirlineApplicationsSeen,
  subscribeToAirlineApplicationsSeen,
} from "@/lib/client-notification-state";
import { cn } from "@/lib/utils";

type NavLinkVariant = "default" | "primary";

export function NavLink({
  href,
  children,
  badgeCount,
  description,
  variant = "default",
  exact = false,
}: {
  href: string;
  children: React.ReactNode;
  badgeCount?: number;
  description?: string;
  variant?: NavLinkVariant;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const [clientBadgeCount, setClientBadgeCount] = useState(badgeCount ?? 0);
  const [currentHash, setCurrentHash] = useState("");
  const [hrefPath, hashFragment] = href.split("#");
  const hrefHash = hashFragment ? `#${hashFragment}` : "";
  const pathMatches =
    exact || hrefPath === "/airline" || hrefPath === "/gsa" || hrefPath === "/admin"
      ? pathname === hrefPath
      : pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  const active = hrefHash ? pathMatches && currentHash === hrefHash : pathMatches && !currentHash;
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
    function syncHash() {
      setCurrentHash(window.location.hash);
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    if (!isAirlineApplicationsLink) return;
    let active = true;

    async function refreshApplicationBadge() {
      if (isAirlineApplicationsPage) {
        markAirlineApplicationsSeen().catch(() => undefined);
        setClientBadgeCount(0);
        return;
      }

      try {
        const [applications, seenState] = await Promise.all([
          getAirlineApplicationsForNotifications(),
          getAirlineApplicationSeenState(),
        ]);
        if (!active) return;
        const unreadCount = applications
          .filter((application) => isUnreadAirlineApplication(application, seenState.lastSeenAt))
          .length;
        setClientBadgeCount(unreadCount);
      } catch {
        if (active) setClientBadgeCount(0);
      }
    }

    refreshApplicationBadge();
    const unsubscribe = subscribeToAirlineApplicationsSeen(refreshApplicationBadge);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [isAirlineApplicationsLink, isAirlineApplicationsPage, pathname]);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative rounded-xl text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25",
        variant === "primary"
          ? "flex min-h-[68px] flex-col gap-1.5 border px-3 py-3"
          : "flex items-center gap-3 px-3 py-2.5",
        active && variant === "primary"
          ? "border-white/20 bg-white/[0.11] text-white shadow-[0_10px_28px_rgba(0,0,0,0.18)] [&_svg]:text-[#8DB6FF]"
          : active
            ? "bg-[rgba(96,165,250,0.12)] text-white [&_svg]:text-[#60A5FA]"
            : variant === "primary"
              ? "border-white/[0.075] bg-white/[0.035] text-white/76 hover:border-white/14 hover:bg-white/[0.07] hover:text-white [&_svg]:text-white/38 hover:[&_svg]:text-[#8DB6FF]"
              : "text-white/45 hover:bg-white/[0.05] hover:text-white/75 [&_svg]:text-white/30 hover:[&_svg]:text-white/55",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        {children}
      </span>
      {description && (
        <span className="ml-7 line-clamp-2 text-[11px] font-medium leading-4 text-white/42 group-hover:text-white/58">
          {description}
        </span>
      )}
      {visibleBadgeCount != null && visibleBadgeCount > 0 && (
        <span
          className={cn(
            "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white",
            variant === "primary" ? "absolute right-3 top-3" : "ml-auto",
          )}
          style={{ boxShadow: '0 0 10px rgba(26,90,255,0.5)' }}
        >
          {visibleBadgeCount > 9 ? "9+" : visibleBadgeCount}
        </span>
      )}
    </Link>
  );
}
