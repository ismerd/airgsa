"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, children, badgeCount }: { href: string; children: React.ReactNode; badgeCount?: number }) {
  const pathname = usePathname();
  const active =
    href === "/airline" || href === "/gsa" || href === "/admin" || href === "/freightforwarder"
      ? pathname === href
      : pathname.startsWith(href);

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
      {badgeCount != null && badgeCount > 0 && (
        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}
    </Link>
  );
}
