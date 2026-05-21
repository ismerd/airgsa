import {
  BarChart3,
  BellRing,
  FileCheck2,
  Globe,
  Handshake,
  Megaphone,
  Newspaper,
  PanelLeft,
  Plane,
  PlaneTakeoff,
  Users,
} from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { getSession } from "@/lib/auth/session";
import { canViewApplication } from "@/lib/auth/permissions";
import { getAirlineProfile } from "@/lib/services/airline-profile";
import { listMandateQuotes, listMonthlyReports } from "@/lib/services/mandate-execution-store";
import { listLiveApplications, listLiveTenders } from "@/lib/services/tender-workflow-store";

function getNav(pendingApplications: number, controlQueueCount: number, accessRole?: string): NavGroup[] {
  if (accessRole === "operator") {
    return [
      {
        heading: "Operations",
        items: [
          { label: "Control Center", href: "/airline", icon: PanelLeft, badgeCount: controlQueueCount },
          { label: "Capacity alerts", href: "/airline/capacity-alerts", icon: BellRing },
        ],
      },
      {
        heading: "My results",
        items: [
          { label: "Performance", href: "/airline/performance", icon: BarChart3 },
        ],
      },
    ];
  }

  return [
  {
    heading: "Overview",
    items: [
      { label: "Control Center", href: "/airline", icon: PanelLeft, badgeCount: controlQueueCount },
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
      { label: "GSA Network", href: "/airline/gsa-network", icon: Globe },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Team & access", href: "/airline/team", icon: Users },
    ],
  },
  ];
}

export default async function AirlineLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const [applications, tenders, quotes, reports] = session
    ? await Promise.all([
        listLiveApplications(),
        listLiveTenders(),
        listMandateQuotes(session),
        listMonthlyReports(session),
      ])
    : [[], [], [], []];
  const profile = await getAirlineProfile(session);
  const tenderById = new Map(tenders.map((tender) => [tender.id, tender]));
  const pendingApplications = session
    ? applications.filter((application) =>
        application.status === "pending" &&
        canViewApplication(session, application, tenderById.get(application.tenderId) ?? null),
      ).length
    : 0;
  const pendingQuoteApprovals = session ? quotes.filter((quote) => quote.status === "airline-approval-required").length : 0;
  const submittedReports = session ? reports.filter((report) => report.status === "submitted").length : 0;
  const controlQueueCount = pendingQuoteApprovals + submittedReports;
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar
        groups={getNav(pendingApplications, controlQueueCount, session?.accessRole)}
        role="Airline"
        brand={{
          name: session?.company ?? "Airline",
          color: "#1a5aff",
          subtitle: "Airline workspace",
          logoSrc: profile.logoPath,
          userAvatarSrc: session?.avatarPath,
          profileHref: "/airline/profile",
          userName: session?.name ?? "-",
        }}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
