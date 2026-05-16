import { BarChart3, Bell, Building2, FileSpreadsheet, Megaphone, Newspaper, PanelLeft } from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dashboard/sidebar";
import { getSession } from "@/lib/auth/session";
import { canViewApplication, canViewTender } from "@/lib/auth/permissions";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { listLiveApplications, listLiveTenders } from "@/lib/services/tender-workflow-store";

function getNav(notificationCount: number): NavGroup[] {
  return [
  {
    heading: "Overview",
    items: [
      { label: "Marketplace", href: "/gsa", icon: PanelLeft },
    ],
  },
  {
    heading: "Opportunities",
    items: [
      { label: "Notifications", href: "/gsa/notifications", icon: Bell, badgeCount: notificationCount },
    ],
  },
  {
    heading: "Analytics",
    items: [
      { label: "Performance", href: "/gsa/performance", icon: BarChart3 },
      { label: "Monthly reports", href: "/gsa/monthly-reports", icon: FileSpreadsheet },
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
        groups={getNav(notificationCount)}
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
