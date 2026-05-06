import { ArrowLeftRight, FileText, LayoutDashboard, Map, PackagePlus, PlaneTakeoff, ScanSearch } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";

const nav = [
  { label: "Dashboard", href: "/freightforwarder", icon: LayoutDashboard },
  { label: "Book shipment", href: "/freightforwarder/booking", icon: PackagePlus },
  { label: "Flights", href: "/freightforwarder/flights", icon: PlaneTakeoff },
  { label: "AWB Tracking", href: "/freightforwarder/tracking", icon: ScanSearch },
  { label: "Find route", href: "/freightforwarder/routes", icon: Map },
  { label: "Flight change", href: "/freightforwarder/changes", icon: ArrowLeftRight },
  { label: "Statements", href: "/freightforwarder/statements", icon: FileText },
];

export default function FreightForwarderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar items={nav} role="Freight Forwarder" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
