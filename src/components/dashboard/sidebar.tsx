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
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-white/10 bg-[#071832] px-4 py-5 lg:block">
      <Link href="/" className="flex items-center gap-3 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-400 text-[#0A1F44]">
          <Plane className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">AirGSA</span>
          <span className="block text-xs text-slate-400">{role} workspace</span>
        </span>
      </Link>
      <nav className="mt-8 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
