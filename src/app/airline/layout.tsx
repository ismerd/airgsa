import { BarChart3, FileCheck2, Handshake, Megaphone, Newspaper, PanelLeft, PlaneTakeoff, Users } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";

const nav = [
  { label: "Dashboard", href: "/airline", icon: PanelLeft },
  { label: "Tenders", href: "/airline/tenders", icon: PlaneTakeoff },
  { label: "Applications", href: "/airline/applications", icon: Users },
  { label: "Performance", href: "/airline/performance", icon: BarChart3 },
  { label: "Contracts & KPI", href: "/airline/contracts", icon: FileCheck2 },
  { label: "Intelligence", href: "/airline/intelligence", icon: Newspaper },
  { label: "Marketing", href: "/airline/campaigns", icon: Megaphone },
  { label: "Partner profiles", href: "/airline/gsa/gsa-bluewing", icon: Handshake },
];

export default function AirlineLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar items={nav} role="Airline" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

