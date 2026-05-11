import { BarChart3, Bell, Building2, Megaphone, Newspaper, PanelLeft, Search } from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";

const nav: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { label: "Marketplace", href: "/gsa", icon: PanelLeft },
    ],
  },
  {
    heading: "Opportunities",
    items: [
      { label: "Tender detail", href: "/gsa/tenders/tnd-eur-001", icon: Search },
      { label: "Notifications", href: "/gsa/notifications", icon: Bell },
    ],
  },
  {
    heading: "Analytics",
    items: [
      { label: "Performance", href: "/gsa/performance", icon: BarChart3 },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "Company profile", href: "/gsa/profile", icon: Building2 },
    ],
  },
  {
    heading: "Market Intelligence",
    items: [
      { label: "Intelligence", href: "/news", icon: Newspaper },
      { label: "Marketing", href: "/gsa/campaigns", icon: Megaphone },
    ],
  },
];

export default function GsaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar groups={nav} role="GSA" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
