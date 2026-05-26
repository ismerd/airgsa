import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, Menu, Plane, UserRound } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { NavLink } from "@/components/dashboard/nav-link";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeCount?: number;
  description?: string;
  exact?: boolean;
  children?: NavItem[];
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
  description?: string;
  variant?: "default" | "primary" | "workspace" | "disclosure";
};

export type SidebarBrand = {
  name: string;
  color: string;
  subtitle?: string;
  logoSrc?: string;
  userAvatarSrc?: string;
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
    <>
    <aside
      className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col overflow-y-auto px-3 py-4 lg:flex"
      style={{
        background: 'linear-gradient(185deg, #071830 0%, #050D1E 100%)',
        borderRight: '1px solid rgba(96,165,250,0.07)',
        boxShadow: '4px 0 40px rgba(0,0,0,0.45)',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="mb-4 flex items-center gap-3 border-b border-white/[0.06] px-2 pb-4"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white"
          style={{ boxShadow: '0 0 24px rgba(26,90,255,0.55), 0 4px 12px rgba(26,90,255,0.35)' }}
        >
          <Plane className="h-[18px] w-[18px]" />
        </span>
        <span>
          <span className="block text-[15px] font-bold tracking-tight text-white">AirGSA</span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-white/35">{role} workspace</span>
        </span>
      </Link>

      {/* Grouped nav */}
      <nav className="flex flex-col gap-4">
        {groups.map((group) => (
          group.variant === "workspace" ? (
            <div key={group.heading}>
              <div className="mb-1.5 px-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/24">
                  {group.heading}
                </p>
                {group.description && (
                  <p className="mt-1 text-[11px] leading-4 text-white/34">{group.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  item.children && item.children.length > 0 ? (
                    <details
                      key={navItemKey(item)}
                      className="group/area rounded-xl border border-white/[0.075] bg-white/[0.035] transition-colors open:border-white/14 open:bg-white/[0.06] [&:has(a[aria-current=page])>summary]:border-white/20 [&:has(a[aria-current=page])>summary]:bg-white/[0.08]"
                    >
                      <summary className="flex min-h-[68px] cursor-pointer list-none items-start gap-3 rounded-xl border border-transparent px-3 py-3 text-white/76 transition hover:bg-white/[0.04] hover:text-white [&::-webkit-details-marker]:hidden">
                        <item.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-white/38 transition-colors group-open/area:text-[#8DB6FF]" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold">{item.label}</span>
                            {item.badgeCount != null && item.badgeCount > 0 && (
                              <span
                                className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white"
                                style={{ boxShadow: '0 0 10px rgba(26,90,255,0.5)' }}
                              >
                                {item.badgeCount > 9 ? "9+" : item.badgeCount}
                              </span>
                            )}
                          </span>
                          {item.description && (
                            <span className="mt-1 block line-clamp-2 text-[11px] font-medium leading-4 text-white/42">
                              {item.description}
                            </span>
                          )}
                        </span>
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-white/34 transition-transform group-open/area:rotate-180 group-open/area:text-white/58" />
                      </summary>
                      <div className="border-t border-white/[0.06] px-2 py-2">
                        <div className="flex flex-col gap-0.5">
                          {item.children.map((child) => (
                            <NavLink key={navItemKey(child)} href={child.href} badgeCount={child.badgeCount} exact={child.exact}>
                              <child.icon className="h-4 w-4 shrink-0 transition-colors" />
                              <span className="min-w-0 truncate">{child.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    </details>
                  ) : (
                    <NavLink
                      key={navItemKey(item)}
                      href={item.href}
                      badgeCount={item.badgeCount}
                      description={item.description}
                      exact={item.exact}
                      variant="primary"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0 transition-colors" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </NavLink>
                  )
                ))}
              </div>
            </div>
          ) : group.variant === "disclosure" ? (
            <details key={group.heading} className="group/details rounded-xl border border-white/[0.06] bg-white/[0.025] px-2 py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/38 transition hover:text-white/68">
                {group.heading}
                <ChevronDown className="h-4 w-4 transition-transform group-open/details:rotate-180" />
              </summary>
              {group.description && (
                <p className="px-2 pb-1 text-[11px] leading-4 text-white/34">{group.description}</p>
              )}
              <div className="flex flex-col gap-0.5 pb-1">
                {group.items.map((item) => (
                  <NavLink key={navItemKey(item)} href={item.href} badgeCount={item.badgeCount} exact={item.exact}>
                    <item.icon className="h-4 w-4 shrink-0 transition-colors" />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </details>
          ) : (
            <div key={group.heading}>
              <div className="mb-1.5 px-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/24">
                  {group.heading}
                </p>
                {group.description && (
                  <p className="mt-1 text-[11px] leading-4 text-white/34">{group.description}</p>
                )}
              </div>
              <div className={group.variant === "primary" ? "flex flex-col gap-2" : "flex flex-col gap-0.5"}>
                {group.items.map((item) => (
                  <NavLink
                    key={navItemKey(item)}
                    href={item.href}
                    badgeCount={item.badgeCount}
                    description={item.description}
                    exact={item.exact}
                    variant={group.variant === "primary" ? "primary" : undefined}
                  >
                    <item.icon className={group.variant === "primary" ? "h-[18px] w-[18px] shrink-0 transition-colors" : "h-4 w-4 shrink-0 transition-colors"} />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/[0.06]">
        {brand ? (
          <>
          {/* Airline chip */}
          <div className="mb-2 flex items-center gap-2.5 rounded-xl px-2 py-2">
            <span
              className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ${
                brand.logoSrc ? "border border-white/15 bg-white" : ""
              }`}
              style={{
                backgroundColor: brand.logoSrc ? "#ffffff" : brand.color,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {brand.logoSrc ? (
                <Image src={brand.logoSrc} alt={brand.name} fill className="object-contain p-1.5" unoptimized />
              ) : (
                <span className="text-xs font-bold text-white">{brand.name.charAt(0).toUpperCase()}</span>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{brand.name}</p>
              {brand.subtitle && <p className="truncate text-[10px] text-white/35">{brand.subtitle}</p>}
            </div>
          </div>
          {/* User profile link */}
          <Link
            href={brand.profileHref}
            className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.05]"
          >
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-[11px] font-bold text-white ring-1 ring-white/10">
              {brand.userAvatarSrc ? (
                <Image src={brand.userAvatarSrc} alt={brand.userName} fill className="object-cover" unoptimized />
              ) : (
                brand.userName.charAt(0).toUpperCase()
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/75">{brand.userName}</p>
              <p className="text-[10px] text-white/30">View profile</p>
            </div>
          </Link>
          </>
        ) : (
          <div className="mb-2 rounded-xl px-2 py-2">
            <p className="text-xs font-semibold text-white">{role} workspace</p>
            <p className="text-[10px] text-white/30">Signed in</p>
          </div>
        )}
        <LogoutButton />
      </div>
    </aside>
    <MobileWorkspaceNav groups={groups} role={role} brand={brand} />
    </>
  );
}

function MobileWorkspaceNav({
  groups,
  role,
  brand,
}: {
  groups: NavGroup[];
  role: string;
  brand?: SidebarBrand;
}) {
  const primaryItems = getPrimaryMobileItems(groups);

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
      <div
        className="rounded-2xl border border-white/10 bg-[#06152A]/95 p-2 shadow-2xl backdrop-blur-xl"
        style={{ boxShadow: "0 18px 60px rgba(0,0,0,0.36), 0 0 0 1px rgba(96,165,250,0.08)" }}
      >
        {primaryItems.length > 0 && (
          <div className="grid grid-cols-4 gap-1">
            {primaryItems.map((item) => (
              <Link
                key={navItemKey(item)}
                href={item.href}
                className="relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-semibold text-white/70 transition hover:bg-white/[0.07] hover:text-white"
              >
                <item.icon className="h-4 w-4 text-white/62" />
                <span className="w-full truncate text-center">{item.label}</span>
                {item.badgeCount != null && item.badgeCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                    {item.badgeCount > 9 ? "9+" : item.badgeCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        <details className="group/mobile mt-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-white/75 transition hover:bg-white/[0.06] hover:text-white [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2">
              <Menu className="h-4 w-4 shrink-0 text-[#8DB6FF]" />
              <span className="min-w-0 truncate text-xs font-semibold">{brand?.name ?? role}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/34">{role}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/45 transition-transform group-open/mobile:rotate-180" />
          </summary>

          <div className="mt-2 max-h-[68vh] overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.035] p-2">
            <nav className="space-y-4">
              {groups.map((group) => (
                <div key={group.heading}>
                  <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                    {group.heading}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      item.children && item.children.length > 0 ? (
                        <div key={navItemKey(item)} className="space-y-0.5">
                          <p className="px-2 pb-0.5 pt-1 text-[11px] font-semibold text-white/45">{item.label}</p>
                          {item.children.map((child) => (
                            <NavLink key={navItemKey(child)} href={child.href} badgeCount={child.badgeCount} exact={child.exact}>
                              <child.icon className="h-4 w-4 shrink-0 transition-colors" />
                              <span className="min-w-0 truncate">{child.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      ) : (
                        <NavLink key={navItemKey(item)} href={item.href} badgeCount={item.badgeCount} exact={item.exact}>
                          <item.icon className="h-4 w-4 shrink-0 transition-colors" />
                          <span className="min-w-0 truncate">{item.label}</span>
                        </NavLink>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-4 border-t border-white/[0.06] pt-3">
              {brand ? (
                <Link
                  href={brand.profileHref}
                  className="mb-1 flex items-center gap-2.5 rounded-lg px-2 py-2 text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-[11px] font-bold text-white ring-1 ring-white/10">
                    {brand.userAvatarSrc ? (
                      <Image src={brand.userAvatarSrc} alt={brand.userName} fill className="object-cover" unoptimized />
                    ) : (
                      brand.userName.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{brand.userName}</span>
                    <span className="block text-[10px] text-white/35">View profile</span>
                  </span>
                </Link>
              ) : (
                <div className="mb-1 flex items-center gap-2.5 rounded-lg px-2 py-2 text-white/65">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08]">
                    <UserRound className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-medium">{role} workspace</span>
                </div>
              )}
              <LogoutButton />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

function getPrimaryMobileItems(groups: NavGroup[]) {
  const allItems = flattenNavItems(groups);
  const preferredLabels = [
    "Control Center",
    "Today Cockpit",
    "Accounts",
    "My Customers",
    "Quote Inbox",
    "Capacity Alerts",
    "My Sales",
    "Overview",
    "Team Performance",
    "Airline Targets",
    "Airline Desk",
    "Decision Room",
    "Tender Pipeline",
    "Cargo Workspace",
    "Contracts & KPI",
  ];
  const selected: NavItem[] = [];

  for (const label of preferredLabels) {
    const match = allItems.find((item) => item.label === label);
    if (match && !selected.some((item) => item.href === match.href)) selected.push(match);
  }

  for (const item of allItems) {
    if (selected.length >= 4) break;
    if (!selected.some((selectedItem) => selectedItem.href === item.href)) selected.push(item);
  }

  return selected.slice(0, 4);
}

function flattenNavItems(groups: NavGroup[]) {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => (item.children && item.children.length > 0 ? item.children : [item])),
  );
}

function navItemKey(item: NavItem) {
  return `${item.href}:${item.label}`;
}
