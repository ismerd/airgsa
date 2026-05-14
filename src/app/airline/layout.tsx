import {
  BarChart3,
  BellRing,
  FileCheck2,
  Handshake,
  Megaphone,
  Newspaper,
  PanelLeft,
  Plane,
  PlaneTakeoff,
  UserCircle,
  Users,
} from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { getSession } from "@/lib/auth/session";
import { getAirlineProfile } from "@/lib/services/airline-profile";
import { listLiveApplications } from "@/lib/services/tender-workflow-store";
import { SAUDIA_CARGO } from "@/lib/saudia-cargo-data";

function getNav(pendingApplications: number): NavGroup[] {
  return [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", href: "/airline", icon: PanelLeft },
    ],
  },
  {
    heading: "Fleet & Capacity",
    items: [
      { label: "Fleet", href: "/airline/fleet", icon: Plane },
      { label: "Capacity alerts", href: "/airline/capacity-alerts", icon: BellRing },
    ],
  },
  {
    heading: "GSA Management",
    items: [
      { label: "Tenders", href: "/airline/tenders", icon: PlaneTakeoff },
      { label: "Applications", href: "/airline/applications", icon: Users, badgeCount: pendingApplications },
      { label: "Partner profiles", href: "/airline/gsa/overview", icon: Handshake },
    ],
  },
  {
    heading: "Analytics",
    items: [
      { label: "Performance", href: "/airline/performance", icon: BarChart3 },
      { label: "Contracts & KPI", href: "/airline/contracts", icon: FileCheck2 },
    ],
  },
  {
    heading: "Market Intelligence",
    items: [
      { label: "Intelligence", href: "/airline/intelligence", icon: Newspaper },
      { label: "Marketing", href: "/airline/campaigns", icon: Megaphone },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Profile", href: "/airline/profile", icon: UserCircle },
    ],
  },
  ];
}

export default async function AirlineLayout({ children }: { children: React.ReactNode }) {
  const [session, profile, applications] = await Promise.all([getSession(), Promise.resolve(getAirlineProfile()), listLiveApplications()]);
  const pendingApplications = applications.filter((application) => application.status === "pending").length;
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar
        groups={getNav(pendingApplications)}
        role="Airline"
        brand={{
          name: SAUDIA_CARGO.name,
          color: SAUDIA_CARGO.color,
          iata: SAUDIA_CARGO.iata,
          logoSrc: profile.logoPath,
          profileHref: "/airline/profile",
          userName: session?.name ?? "-",
        }}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
