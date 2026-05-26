import { BarChart3, BellRing, BriefcaseBusiness, Building2, CalendarDays, CheckSquare2, FileSearch, FileSpreadsheet, Inbox, Megaphone, MessageSquareText, Newspaper, Package, PackageSearch, PanelLeft, Plug, Settings2, Target, Users, UserRound } from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { canViewTender, isApplicationOwnedByGsa } from "@/lib/auth/permissions";
import { getFreshSession } from "@/lib/auth/session";
import { getGsaCompanyProfile } from "@/lib/services/gsa-company-profile";
import { resolveGsaOperationalProfileFromWorkflow } from "@/lib/services/gsa-profile";
import { getGsaNavigationSignals } from "@/lib/services/mandate-execution-store";
import { getTenderWorkflowSnapshot } from "@/lib/services/tender-workflow-store";

function getNav(notificationCount: number, pendingQuoteCount: number, newTenderCount: number, accessRole?: string): NavGroup[] {
  if (accessRole === "operator") {
    return [
      {
        heading: "Work areas",
        variant: "workspace",
        items: [
          {
            label: "GSA Work",
            href: "/gsa",
            icon: BriefcaseBusiness,
            badgeCount: notificationCount + pendingQuoteCount,
            description: "Daily desk, quotes, bookings.",
            children: [
              { label: "Today Cockpit", href: "/gsa", icon: PanelLeft, badgeCount: notificationCount },
              { label: "My Tasks", href: "/gsa/tasks", icon: CheckSquare2 },
              { label: "My Customers", href: "/gsa/customers", icon: UserRound },
              { label: "Quote Inbox", href: "/gsa/quotes", icon: Inbox, badgeCount: pendingQuoteCount },
              { label: "Active Shipments", href: "/gsa/shipments", icon: Package },
              { label: "Capacity Alerts", href: "/gsa/capacity-alerts", icon: BellRing },
              { label: "Cargo Workspace", href: "/gsa/cargo-workspace", icon: PackageSearch },
              { label: "Flight Schedule", href: "/gsa/flights", icon: CalendarDays },
            ],
          },
          {
            label: "My Sales",
            href: "/gsa/performance",
            icon: Target,
            description: "Own revenue and bookings.",
            exact: true,
          },
        ],
      },
      {
        heading: "Extended tools",
        variant: "disclosure",
        description: "Useful later, not required for the daily cargo desk.",
        items: [
          { label: "Market News", href: "/news", icon: Newspaper },
        ],
      },
    ];
  }

  return [
    {
      heading: "Work areas",
      variant: "workspace",
      items: [
        {
          label: "GSA Work",
          href: "/gsa",
          icon: BriefcaseBusiness,
          badgeCount: notificationCount + pendingQuoteCount,
          description: "Daily desk, quotes, bookings.",
          children: [
            { label: "Today Cockpit", href: "/gsa", icon: PanelLeft, badgeCount: notificationCount },
            { label: "My Tasks", href: "/gsa/tasks", icon: CheckSquare2 },
            { label: "Quote Inbox", href: "/gsa/quotes", icon: Inbox, badgeCount: pendingQuoteCount },
            { label: "Active Shipments", href: "/gsa/shipments", icon: Package },
            { label: "Customers", href: "/gsa/customers", icon: UserRound },
            { label: "Capacity Alerts", href: "/gsa/capacity-alerts", icon: BellRing },
            { label: "Cargo Workspace", href: "/gsa/cargo-workspace", icon: PackageSearch },
            { label: "Flight Schedule", href: "/gsa/flights", icon: CalendarDays },
          ],
        },
        {
          label: "Performance",
          href: "/gsa/performance",
          icon: Target,
          description: "Overview, team, airline targets.",
          children: [
            { label: "Overview", href: "/gsa/performance", icon: BarChart3, exact: true },
            { label: "Team Performance", href: "/gsa/performance/team", icon: Users },
            { label: "Airline Targets", href: "/gsa/performance/airlines", icon: Target },
          ],
        },
        {
          label: "Airline Desk",
          href: "/gsa/airline-desk",
          icon: MessageSquareText,
          badgeCount: notificationCount + newTenderCount,
          description: "Reports, tenders, airline actions.",
          children: [
            { label: "Airline Desk", href: "/gsa/airline-desk", icon: MessageSquareText, badgeCount: notificationCount },
            { label: "Tender Pipeline", href: "/gsa/tenders", icon: FileSearch, badgeCount: newTenderCount },
            { label: "Customer Reports", href: "/gsa/monthly-reports", icon: FileSpreadsheet },
            { label: "Notifications", href: "/gsa/notifications", icon: BellRing, badgeCount: notificationCount },
          ],
        },
        {
          label: "Company Settings",
          href: "/gsa/profile",
          icon: Settings2,
          description: "Profile, team, integrations.",
          children: [
            { label: "Company Profile", href: "/gsa/profile", icon: Building2 },
            { label: "Team & Access", href: "/gsa/team", icon: Users },
            { label: "Integrations", href: "/gsa/integrations", icon: Plug },
          ],
        },
      ],
    },
    {
      heading: "Extended tools",
      variant: "disclosure",
      description: "Useful later, not required for the daily cargo desk.",
      items: [
        { label: "Market News", href: "/news", icon: Newspaper },
        { label: "Marketing", href: "/gsa/campaigns", icon: Megaphone },
      ],
    },
  ];
}

export default async function GsaLayout({ children }: { children: React.ReactNode }) {
  const session = await getFreshSession();
  const workflowPromise = session ? getTenderWorkflowSnapshot() : Promise.resolve({ tenders: [], applications: [], contracts: [] });
  const [workflow, profileAssets, navigationSignals] = session
    ? await Promise.all([
        workflowPromise,
        getGsaCompanyProfile(session),
        workflowPromise.then((snapshot) => getGsaNavigationSignals(session, snapshot.contracts)),
      ])
    : [await workflowPromise, null, { quotes: [], notifications: [] }];
  const partner = session ? resolveGsaOperationalProfileFromWorkflow(session, workflow.contracts, workflow.applications) : null;
  const tenders = workflow.tenders;
  const applications = workflow.applications;
  const { quotes, notifications } = navigationSignals;
  const notificationCount = session
    ? notifications.filter((notification) => !notification.readAt).length
    : 0;
  const pendingQuoteCount = session
    ? quotes.filter((quote) => ["airline-approved", "auto-approved", "countered"].includes(quote.status)).length
    : 0;
  const ownApplicationTenderIds = new Set(
    session
      ? applications
          .filter((application) => isApplicationOwnedByGsa(session, application))
          .map((application) => application.tenderId)
      : [],
  );
  const newTenderCount = session
    ? tenders.filter((tender) => canViewTender(session, tender) && !ownApplicationTenderIds.has(tender.id)).length
    : 0;

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar
        groups={getNav(notificationCount, pendingQuoteCount, newTenderCount, session?.accessRole)}
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
      <div className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</div>
    </div>
  );
}
