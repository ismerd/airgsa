import { ArrowLeftRight, FileText, LayoutDashboard, Map, PackagePlus, PlaneTakeoff, ScanSearch } from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";

const nav: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", href: "/freightforwarder", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Shipments",
    items: [
      { label: "Book shipment", href: "/freightforwarder/booking", icon: PackagePlus },
      { label: "AWB Tracking", href: "/freightforwarder/tracking", icon: ScanSearch },
      { label: "Statements", href: "/freightforwarder/statements", icon: FileText },
    ],
  },
  {
    heading: "Flights & Routes",
    items: [
      { label: "Flights", href: "/freightforwarder/flights", icon: PlaneTakeoff },
      { label: "Find route", href: "/freightforwarder/routes", icon: Map },
      { label: "Flight change", href: "/freightforwarder/changes", icon: ArrowLeftRight },
    ],
  },
];

export default function FreightForwarderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar groups={nav} role="Freight Forwarder" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
