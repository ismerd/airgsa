import { AlertTriangle, FileSpreadsheet, PackageCheck } from "lucide-react";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { listControlActions, listMandateQuotes, listMonthlyReports } from "@/lib/services/mandate-execution-store";

export default async function GsaTasksPage() {
  const session = await getSession();
  const [actions, quotes, reports] = session
    ? await Promise.all([listControlActions(session), listMandateQuotes(session), listMonthlyReports(session)])
    : [[], [], []];
  const openActions = actions.filter((action) => action.status !== "completed" && action.status !== "cancelled");
  const approvedQuotes = quotes.filter((quote) => quote.status === "auto-approved" || quote.status === "airline-approved");
  const reportFixes = reports.filter((report) => report.status === "changes-requested");

  return (
    <>
      <Topbar title="My Tasks" subtitle="Mobile GSA task queue" />
      <main className="space-y-4 p-4 md:p-5">
        <section className="grid gap-3 sm:grid-cols-3">
          <TaskMetric icon={<AlertTriangle className="h-4 w-4" />} label="Open actions" value={String(openActions.length)} />
          <TaskMetric icon={<PackageCheck className="h-4 w-4" />} label="Quotes to book" value={String(approvedQuotes.length)} />
          <TaskMetric icon={<FileSpreadsheet className="h-4 w-4" />} label="Report fixes" value={String(reportFixes.length)} />
        </section>

        <TaskSection title="Airline control actions" empty="No open airline actions.">
          {openActions.map((action) => (
            <Link key={action.id} href="/gsa/performance" className="block rounded-lg border border-border-ui bg-surface2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={action.severity === "critical" ? "danger" : "warning"}>{action.severity}</Badge>
                <Badge variant={action.status === "in-progress" ? "warning" : "default"}>{action.status}</Badge>
              </div>
              <p className="mt-2 font-semibold text-ink">{action.title}</p>
              <p className="mt-1 text-sm text-ink-muted">{action.airline} - due {action.dueDate ?? "not set"}</p>
            </Link>
          ))}
        </TaskSection>

        <TaskSection title="Approved quotes to book" empty="No approved quotes waiting for booking.">
          {approvedQuotes.slice(0, 8).map((quote) => (
            <Link key={quote.id} href="/gsa/cargo-workspace" className="block rounded-lg border border-border-ui bg-surface2 p-4">
              <p className="font-semibold text-ink">{quote.customer}</p>
              <p className="mt-1 text-sm text-ink-muted">{quote.origin}-{quote.destination} - EUR {quote.requestedRatePerKg.toFixed(2)}/kg - {quote.weightKg.toLocaleString()} kg</p>
            </Link>
          ))}
        </TaskSection>

        <TaskSection title="Monthly report changes" empty="No monthly report changes requested.">
          {reportFixes.map((report) => (
            <Link key={report.id} href="/gsa/monthly-reports" className="block rounded-lg border border-warning/25 bg-warning-bg p-4">
              <p className="font-semibold text-ink">{report.period} - {report.airline}</p>
              <p className="mt-1 text-sm text-warning">{report.airlineReviewNote ?? "Airline requested changes."}</p>
            </Link>
          ))}
        </TaskSection>
      </main>
    </>
  );
}

function TaskMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskSection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {hasChildren ? children : (
          <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">{empty}</div>
        )}
      </CardContent>
    </Card>
  );
}
