import { BarChart3, BellRing, Building2, CalendarDays, CheckSquare2, FileSpreadsheet, Inbox, Megaphone, Newspaper, Package, PackageSearch, PanelLeft, Plug, Users, UserRound } from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { getFreshSession } from "@/lib/auth/session";
import { canViewApplication, canViewTender } from "@/lib/auth/permissions";
import { getGsaCompanyProfile } from "@/lib/services/gsa-company-profile";
import { resolveGsaOperationalProfile } from "@/lib/services/gsa-profile";
import { listMandateQuotes, listWorkflowNotifications } from "@/lib/services/mandate-execution-store";
import { listLiveApplications, listLiveTenders } from "@/lib/services/tender-workflow-store";

function getNav(notificationCount: number, pendingQuoteCount: number, accessRole?: string): NavGroup[] {
  if (accessRole === "operator") {
    return [
      {
        heading: "Workspace",
        items: [
          { label: "My Tasks", href: "/gsa/tasks", icon: CheckSquare2 },
          { label: "Quote Inbox", href: "/gsa/quotes", icon: Inbox, badgeCount: pendingQuoteCount },
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
      heading: "Home",
      items: [
        { label: "Operations Cockpit", href: "/gsa", icon: PanelLeft, badgeCount: notificationCount },
      ],
    },
    {
      heading: "Operations",
      items: [
        { label: "My Tasks", href: "/gsa/tasks", icon: CheckSquare2 },
        { label: "Quote Inbox", href: "/gsa/quotes", icon: Inbox, badgeCount: pendingQuoteCount },
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
        { label: "Integrations", href: "/gsa/integrations", icon: Plug },
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
  const session = await getFreshSession();
  const [tenders, applications, quotes, notifications, partner, profileAssets] = session
    ? await Promise.all([
        listLiveTenders(),
        listLiveApplications(),
        listMandateQuotes(session),
        listWorkflowNotifications(session),
        resolveGsaOperationalProfile(session),
        getGsaCompanyProfile(session),
      ])
    : [[], [], [], [], null, null];
  const appliedTenderIds = new Set(
    session
      ? applications.filter((application) => canViewApplication(session, application, null)).map((application) => application.tenderId)
      : [],
  );
  const notificationCount = session
    ? notifications.filter((notification) => !notification.readAt).length +
      tenders.filter((tender) => canViewTender(session, tender) && !appliedTenderIds.has(tender.id)).length
    : 0;
  const pendingQuoteCount = session
    ? quotes.filter((quote) => ["airline-approved", "auto-approved", "countered"].includes(quote.status)).length
    : 0;

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar
        groups={getNav(notificationCount, pendingQuoteCount, session?.accessRole)}
        role="GSA"
        brand={{
          name: partner?.name ?? session?.company ?? "GSA",
          color: partner?.color ?? "#2563EB",
          subtitle: partner?.country ?? "GSA workspace",
          logoSrc: profileAssets?.logoPath,
          userAvatarSrc: session?.avatarPath,
          profileHref: "/gsa/profile",
          userName: session?.name ?? partner?.contactName ?? "GSA user",
        }}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
