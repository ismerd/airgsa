import Link from "next/link";
import { ArrowRight, ClipboardList, Database, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { getSession } from "@/lib/auth/session";
import { getAllRegistrations, getPendingRegistrations } from "@/lib/registrations";
import { listControlActions, listMandateAuditEvents, listMandateBookings, listMonthlyReports } from "@/lib/services/mandate-execution-store";
import { listLiveApplications, listLivePartnerContracts, listLiveTenders } from "@/lib/services/tender-workflow-store";
import { DemoSeedButton } from "./demo-seed-button";

export const revalidate = 30;

export default async function AdminPage() {
  const session = await getSession();
  const [pending, registrations, tenders, applications, contracts] = await Promise.all([
    getPendingRegistrations(),
    getAllRegistrations(),
    listLiveTenders(),
    listLiveApplications(),
    listLivePartnerContracts(),
  ]);
  const [bookings, actions, reports, auditEvents] = session
    ? await Promise.all([
        listMandateBookings(session),
        listControlActions(session),
        listMonthlyReports(session),
        listMandateAuditEvents(session),
      ])
    : [[], [], [], []];
  const pendingCount = pending.length;
  const openTenders = tenders.filter((tender) => tender.status === "open").length;
  const activeContracts = contracts.filter((contract) => contract.status === "active").length;
  const pendingWorkflowItems = applications.filter((application) => application.status === "pending").length +
    actions.filter((action) => action.status === "open" || action.status === "in-progress").length +
    reports.filter((report) => report.status === "submitted" || report.status === "changes-requested").length +
    pendingCount;

  const stats = [
    { label: "Approved accounts", value: String(registrations.filter((registration) => registration.status === "approved").length), icon: Users },
    { label: "Pending work", value: String(pendingWorkflowItems), icon: ShieldCheck, alert: pendingWorkflowItems > 0 },
    { label: "Active contracts", value: String(activeContracts), icon: ClipboardList },
    { label: "Bookings logged", value: String(bookings.length), icon: Database },
  ];

  const recentActivity = [
    ...pending.slice(0, 3).map((r) => ({
      text: `${r.name} (${r.company}) — access request pending`,
      time: formatDateTime(r.submittedAt),
      dot: "bg-amber-400",
    })),
    ...auditEvents.slice(0, 5).map((event) => ({
      text: event.summary,
      time: formatDateTime(event.createdAt),
      dot: "bg-brand",
    })),
  ].slice(0, 6);

  return (
    <>
      <Topbar title="Platform operations" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* KPI tiles */}
          <div className="grid gap-5 md:grid-cols-4">
            {stats.map((item) => (
              <Card key={item.label} className={item.alert ? "border-amber-500/40 bg-amber-500/5" : ""}>
                <CardContent className="p-5">
                  <item.icon className={`h-5 w-5 ${item.alert ? "text-amber-400" : "text-brand"}`} />
                  <p className="mt-4 text-sm text-ink-muted">{item.label}</p>
                  <p className={`mt-1 text-3xl font-bold ${item.alert ? "text-amber-400" : "text-ink"}`}>
                    {item.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pending CTA */}
          {pendingCount > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="font-semibold text-amber-300">
                    {pendingCount} access request{pendingCount > 1 ? "s" : ""} awaiting review
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {pending.map((r) => r.company).join(", ")}
                  </p>
                </div>
                <Link
                  href="/admin/accounts"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors"
                >
                  Review <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          )}

          {process.env.NODE_ENV !== "production" && (
            <Card>
              <CardContent className="p-5">
                <DemoSeedButton />
              </CardContent>
            </Card>
          )}

          {/* Recent activity */}
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-ink">Recent activity</p>
              {recentActivity.length === 0 ? (
                <p className="mt-4 text-sm text-ink-muted">
                  No workflow activity has been recorded yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {recentActivity.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                      <div>
                        <p className="text-sm text-ink-muted">{item.text}</p>
                        <p className="text-xs text-ink-muted/60">{item.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Manage accounts", href: "/admin/accounts", desc: "Review registrations, approve or reject access requests" },
              { label: "LinkedIn sources", href: "/admin/sources", desc: "Configure LinkedIn pages for cargo intelligence import" },
              { label: "Open tenders", href: "/airline/tenders", desc: `${openTenders} live tender${openTenders === 1 ? "" : "s"} currently visible in the workflow` },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-xl border border-border-ui bg-surface p-4 transition-colors hover:border-brand/40 hover:bg-surface2"
              >
                <p className="text-sm font-semibold text-ink group-hover:text-brand transition-colors">{link.label}</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">{link.desc}</p>
              </Link>
            ))}
          </div>

        </div>
      </main>
    </>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}
