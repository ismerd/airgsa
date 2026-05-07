import React from "react";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Topbar({
  title,
  subtitle,
  belowBar,
}: {
  title: string;
  subtitle: string;
  belowBar?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border-ui bg-surface/90 px-6 py-4 backdrop-blur shadow-[0_1px_12px_rgba(11,30,79,0.06)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">{subtitle}</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-ink">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden w-64 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input className="pl-9" placeholder="Search tenders, GSAs, lanes…" />
          </div>
          <ThemeToggle />
          <Link
            href="/gsa/notifications"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Link>
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
