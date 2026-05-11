import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Plane } from "lucide-react";
import { NavLink } from "@/components/dashboard/nav-link";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
};

export function Sidebar({ groups, role }: { groups: NavGroup[]; role: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto bg-navy px-3 py-5 shadow-[4px_0_24px_rgba(11,30,79,0.18)] lg:flex">
      {/* Logo */}
      <Link
        href="/"
        className="mb-5 flex items-center gap-3 px-2 pb-5 border-b border-white/[0.08]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_4px_12px_rgba(26,90,255,0.4)]">
          <Plane className="h-[18px] w-[18px]" />
        </span>
        <span>
          <span className="block text-[15px] font-bold tracking-tight text-white">AirGSA</span>
          <span className="block text-[10px] uppercase tracking-[0.12em] text-white/40">{role} workspace</span>
        </span>
      </Link>

      {/* Grouped nav */}
      <nav className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
              {group.heading}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} href={item.href}>
                  <item.icon className="h-4 w-4 shrink-0 transition-colors" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
