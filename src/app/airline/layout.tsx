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
  Users,
} from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";

const nav: NavGroup[] = [
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
      { label: "Applications", href: "/airline/applications", icon: Users },
      { label: "Partner profiles", href: "/airline/gsa/gsa-bluewing", icon: Handshake },
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
];

export default function AirlineLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar groups={nav} role="Airline" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
