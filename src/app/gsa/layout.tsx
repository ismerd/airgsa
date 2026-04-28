import { BarChart3, Bell, Building2, Newspaper, PanelLeft, Search } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";

const nav = [
  { label: "Marketplace", href: "/gsa", icon: PanelLeft },
  { label: "Tender detail", href: "/gsa/tenders/tnd-eur-001", icon: Search },
  { label: "Company profile", href: "/gsa/profile", icon: Building2 },
  { label: "Performance", href: "/gsa/performance", icon: BarChart3 },
  { label: "Notifications", href: "/gsa/notifications", icon: Bell },
  { label: "Intelligence", href: "/news", icon: Newspaper },
];

export default function GsaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar items={nav} role="GSA" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

