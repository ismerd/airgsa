"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
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
          ? "bg-white/[0.10] text-white [&_svg]:text-brand"
          : "text-white/50 hover:bg-white/[0.06] hover:text-white/80 [&_svg]:text-white/35",
      )}
    >
      {children}
      {active && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
    </Link>
  );
}
