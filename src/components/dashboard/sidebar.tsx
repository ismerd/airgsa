import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Plane } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export function Sidebar({ items, role }: { items: NavItem[]; role: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-navy px-4 py-6 shadow-[4px_0_24px_rgba(11,30,79,0.18)] lg:flex">
      {/* Logo */}
      <Link
        href="/"
        className="mb-6 flex items-center gap-3 px-2 pb-5 border-b border-white/[0.08]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_4px_12px_rgba(26,90,255,0.4)]">
          <Plane className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[15px] font-bold tracking-tight text-white">AirGSA</span>
          <span className="block text-[10px] uppercase tracking-[0.12em] text-white/40">{role} workspace</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/50 transition-all duration-150 hover:bg-white/[0.07] hover:text-white/85"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
