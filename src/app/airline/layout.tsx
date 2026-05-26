import {
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  Building2,
  FileCheck2,
  Globe,
  Handshake,
  Megaphone,
  Newspaper,
  PanelLeft,
  Plane,
  PlaneTakeoff,
  Settings2,
  Users,
} from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { getFreshSession } from "@/lib/auth/session";
import { canViewApplication } from "@/lib/auth/permissions";
import { getAirlineProfile } from "@/lib/services/airline-profile";
import { listMandateQuotes, listMonthlyReports } from "@/lib/services/mandate-execution-store";
import { listLiveApplications, listLiveTenders } from "@/lib/services/tender-workflow-store";

function getNav(pendingApplications: number, controlQueueCount: number, accessRole?: string): NavGroup[] {
  if (accessRole === "operator") {
    return [
      {
        heading: "Work areas",
        variant: "workspace",
        items: [
          {
            label: "Airline Work",
            href: "/airline",
            icon: BriefcaseBusiness,
            badgeCount: controlQueueCount,
            description: "Control, capacity, results.",
            children: [
              { label: "Control Center", href: "/airline", icon: PanelLeft, badgeCount: controlQueueCount },
              { label: "Capacity Alerts", href: "/airline/capacity-alerts", icon: BellRing },
              { label: "Performance", href: "/airline/performance", icon: BarChart3 },
            ],
          },
          {
            label: "Tender Desk",
            href: "/airline/tenders",
            icon: PlaneTakeoff,
            badgeCount: pendingApplications,
            description: "Tenders and GSA decisions.",
            children: [
              { label: "Tender Pipeline", href: "/airline/tenders", icon: PlaneTakeoff },
              { label: "Decision Room", href: "/airline/applications", icon: Users, badgeCount: pendingApplications },
            ],
          },
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
        label: "Airline Work",
        href: "/airline",
        icon: BriefcaseBusiness,
        badgeCount: controlQueueCount,
        description: "Control, capacity, results.",
        children: [
          { label: "Control Center", href: "/airline", icon: PanelLeft, badgeCount: controlQueueCount },
          { label: "Fleet", href: "/airline/fleet", icon: Plane },
          { label: "Capacity Alerts", href: "/airline/capacity-alerts", icon: BellRing },
          { label: "Route Performance", href: "/airline/performance", icon: BarChart3 },
          { label: "Contracts & KPI", href: "/airline/contracts", icon: FileCheck2 },
        ],
      },
      {
        label: "Tender Desk",
        href: "/airline/tenders",
        icon: PlaneTakeoff,
        badgeCount: pendingApplications,
        description: "Tenders, GSAs, growth.",
        children: [
          { label: "Tender Pipeline", href: "/airline/tenders", icon: PlaneTakeoff },
          { label: "Decision Room", href: "/airline/applications", icon: Users, badgeCount: pendingApplications },
          { label: "Partner Activation", href: "/airline/gsa/overview", icon: Handshake },
          { label: "GSA Network", href: "/airline/gsa-network", icon: Globe },
        ],
      },
      {
        label: "Company Settings",
        href: "/airline/profile",
        icon: Settings2,
        description: "Profile, team access.",
        children: [
          { label: "Company Profile", href: "/airline/profile", icon: Building2 },
          { label: "Team & Access", href: "/airline/team", icon: Users },
        ],
      },
    ],
  },
  {
    heading: "Extended tools",
    variant: "disclosure",
    description: "Useful later, not required for the daily tender and contract flow.",
    items: [
      { label: "Intelligence", href: "/airline/intelligence", icon: Newspaper },
      { label: "Marketing", href: "/airline/campaigns", icon: Megaphone },
    ],
  },
  ];
}

export default async function AirlineLayout({ children }: { children: React.ReactNode }) {
  const session = await getFreshSession();
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
      <div className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</div>
    </div>
  );
}
