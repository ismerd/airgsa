import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Plane } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { NavLink } from "@/components/dashboard/nav-link";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeCount?: number;
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
};

export type SidebarBrand = {
  name: string;
  color: string;
  iata: string;
  logoSrc?: string;
  profileHref: string;
  userName: string;
};

export function Sidebar({
  groups,
  role,
  brand,
}: {
  groups: NavGroup[];
  role: string;
  brand?: SidebarBrand;
}) {
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
                <NavLink key={item.href} href={item.href} badgeCount={item.badgeCount}>
                  <item.icon className="h-4 w-4 shrink-0 transition-colors" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/[0.08]">
        {brand ? (
          <>
          {/* Airline chip */}
          <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span
              className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-sm"
              style={{ backgroundColor: brand.color }}
            >
              {brand.logoSrc ? (
                <Image src={brand.logoSrc} alt={brand.name} fill className="object-contain p-0.5" unoptimized />
              ) : (
                <span className="text-xs font-bold text-white">{brand.name.charAt(0).toUpperCase()}</span>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{brand.name}</p>
              <p className="text-[10px] font-mono text-white/40">{brand.iata}</p>
            </div>
          </div>
          {/* User profile link */}
          <Link
            href={brand.profileHref}
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.06]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white">
              {brand.userName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/80">{brand.userName}</p>
              <p className="text-[10px] text-white/35">View profile</p>
            </div>
          </Link>
          </>
        ) : (
          <div className="mb-2 rounded-lg px-2 py-2">
            <p className="text-xs font-semibold text-white">{role} workspace</p>
            <p className="text-[10px] text-white/35">Signed in</p>
          </div>
        )}
        <LogoutButton />
      </div>
    </aside>
  );
}
