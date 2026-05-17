import { BarChart3, BellRing, Building2, CalendarDays, CheckSquare2, FileSpreadsheet, Inbox, Megaphone, Newspaper, Package, PackageSearch, PanelLeft, Users, UserRound } from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { getSession } from "@/lib/auth/session";
import { canViewApplication, canViewTender } from "@/lib/auth/permissions";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { listLiveApplications, listLiveTenders } from "@/lib/services/tender-workflow-store";

const PENDING_QUOTES = 3;

function getNav(notificationCount: number, accessRole?: string): NavGroup[] {
  if (accessRole === "operator") {
    return [
      {
        heading: "Workspace",
        items: [
          { label: "My Tasks", href: "/gsa/tasks", icon: CheckSquare2 },
          { label: "Quote Inbox", href: "/gsa/quotes", icon: Inbox, badgeCount: PENDING_QUOTES },
          { label: "Capacity Alerts", href: "/gsa/capacity-alerts", icon: BellRing },
          { label: "Cargo Workspace", href: "/gsa/cargo-workspace", icon: PackageSearch },
        ],
      },
      {
        heading: "Shipments",
        items: [
          { label: "Active Shipments", href: "/gsa/shipments", icon: Package },
          { label: "Flight Schedule", href: "/gsa/flights", icon: CalendarDays },
        ],
      },
      {
        heading: "Overview",
        items: [
          { label: "Customers", href: "/gsa/customers", icon: UserRound },
          { label: "Performance", href: "/gsa/performance", icon: BarChart3 },
        ],
      },
    ];
  }

  return [
    {
      heading: "Market",
      items: [
        { label: "Marketplace", href: "/gsa", icon: PanelLeft },
      ],
    },
    {
      heading: "Operations",
      items: [
        { label: "My Tasks", href: "/gsa/tasks", icon: CheckSquare2 },
        { label: "Quote Inbox", href: "/gsa/quotes", icon: Inbox, badgeCount: PENDING_QUOTES },
        { label: "Capacity Alerts", href: "/gsa/capacity-alerts", icon: BellRing },
        { label: "Cargo Workspace", href: "/gsa/cargo-workspace", icon: PackageSearch },
      ],
    },
    {
      heading: "Shipments",
      items: [
        { label: "Active Shipments", href: "/gsa/shipments", icon: Package },
        { label: "Flight Schedule", href: "/gsa/flights", icon: CalendarDays },
      ],
    },
    {
      heading: "Customers",
      items: [
        { label: "My Customers", href: "/gsa/customers", icon: UserRound },
        { label: "Customer Reports", href: "/gsa/monthly-reports", icon: FileSpreadsheet },
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
        { label: "Company Profile", href: "/gsa/profile", icon: Building2 },
        { label: "Team & Access", href: "/gsa/team", icon: Users },
      ],
    },
    {
      heading: "Intelligence",
      items: [
        { label: "Market News", href: "/news", icon: Newspaper },
        { label: "Marketing", href: "/gsa/campaigns", icon: Megaphone },
      ],
    },
  ];
}

export default async function GsaLayout({ children }: { children: React.ReactNode }) {
  const [session, tenders, applications] = await Promise.all([getSession(), listLiveTenders(), listLiveApplications()]);
  const partner = realGsaPartners.find((item) => item.email === session?.email) ??
    realGsaPartners.find((item) => item.name === session?.company);
  const appliedTenderIds = new Set(
    session
      ? applications.filter((application) => canViewApplication(session, application, null)).map((application) => application.tenderId)
      : [],
  );
  const notificationCount = session
    ? tenders.filter((tender) => canViewTender(session, tender) && !appliedTenderIds.has(tender.id)).length
    : 0;

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar
        groups={getNav(notificationCount, session?.accessRole)}
        role="GSA"
        brand={{
          name: partner?.name ?? session?.company ?? "GSA",
          color: partner?.color ?? "#2563EB",
          iata: partner?.country ?? "GSA",
          profileHref: "/gsa/profile",
          userName: session?.name ?? partner?.contactName ?? "GSA user",
        }}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
