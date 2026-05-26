import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, BellRing, FileSearch, FileSpreadsheet, MessageSquareText, Plane, Send, Target } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import {
  getGsaAirlineDeskData,
  type ContractControlAction,
  type MonthlyContractReport,
} from "@/lib/services/mandate-execution-store";
import type { LivePartnerContract } from "@/lib/services/tender-workflow-store";
import { GsaControlActionsClient } from "@/app/gsa/performance/control-actions-client";

type AirlineDeskRow = {
  contract: LivePartnerContract;
  openActions: ContractControlAction[];
  reportStatus: "missing" | "draft" | "submitted" | "accepted" | "changes-requested" | "rejected";
  revenuePct: number;
  tonnagePct: number;
  riskLevel: "green" | "amber" | "red";
};

export default async function GsaAirlineDeskPage() {
  const session = await getSession();

  if (!session) {
    return (
      <>
        <Topbar title="Airline Desk" subtitle="Authentication required" />
        <main className="p-5">
          <Card>
            <CardContent className="p-8 text-sm text-ink-muted">Please log in to open the airline desk.</CardContent>
          </Card>
        </main>
      </>
    );
  }

  const { contracts: visibleContracts, performance, controlActions, reports, notifications, quotes } = await getGsaAirlineDeskData(session);
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const openActions = controlActions.filter((action) => action.status !== "completed" && action.status !== "cancelled");
  const changeRequests = reports.filter((report) => report.status === "changes-requested");
  const pendingAirlineApprovals = quotes.filter((quote) => quote.status === "airline-approval-required");
  const unreadSignals = notifications.filter((notification) => !notification.readAt);
  const rows = visibleContracts
    .filter((contract) => contract.status !== "closed")
    .map((contract): AirlineDeskRow => {
      const contractReports = reports.filter((report) => report.contractId === contract.id);
      const currentReport = contractReports.find((report) => report.period === currentPeriod);
      const snapshot = performance.find((item) => item.contractId === contract.id);
      return {
        contract,
        openActions: openActions.filter((action) => action.contractId === contract.id),
        reportStatus: currentReport?.status ?? "missing",
        revenuePct: snapshot?.revenueAttainmentPct ?? 0,
        tonnagePct: snapshot?.tonnageAttainmentPct ?? 0,
        riskLevel: snapshot?.riskLevel ?? "green",
      };
    })
    .sort((left, right) =>
      riskRank(right.riskLevel) - riskRank(left.riskLevel) ||
      right.openActions.length - left.openActions.length ||
      left.contract.airline.localeCompare(right.contract.airline),
    );
  const missingCurrentReports = rows.filter((row) => row.contract.status === "active" && row.reportStatus === "missing").length;

  return (
    <>
      <Topbar title="Airline Desk" subtitle="Reports, airline actions, and partner communication" />
      <main className="space-y-5 p-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Plane className="h-5 w-5" />} label="Airline contracts" value={String(rows.length)} helper={`${rows.filter((row) => row.contract.status === "active").length} active`} />
          <MetricCard icon={<MessageSquareText className="h-5 w-5" />} label="Open airline actions" value={String(openActions.length)} helper={`${openActions.filter((action) => action.severity === "critical").length} critical`} tone={openActions.length > 0 ? "warning" : "success"} />
          <MetricCard icon={<FileSpreadsheet className="h-5 w-5" />} label="Reports needing work" value={String(missingCurrentReports + changeRequests.length)} helper={`${changeRequests.length} change requests`} tone={missingCurrentReports + changeRequests.length > 0 ? "warning" : "success"} />
          <MetricCard icon={<BellRing className="h-5 w-5" />} label="Airline signals" value={String(unreadSignals.length)} helper={`${pendingAirlineApprovals.length} approvals waiting at airline`} tone={unreadSignals.length > 0 ? "warning" : "success"} />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-brand" /> Airline relationships</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows.map((row) => (
                <div key={row.contract.id} className="rounded-lg border border-border-ui bg-surface2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{row.contract.airline}</p>
                      <p className="mt-1 text-sm text-ink-muted">{row.contract.market} - {row.contract.status}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={riskVariant(row.riskLevel)}>{row.riskLevel}</Badge>
                      <Badge variant={reportVariant(row.reportStatus)}>{reportLabel(row.reportStatus)}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniMetric label="Revenue" value={`${row.revenuePct}%`} />
                    <MiniMetric label="Tonnage" value={`${row.tonnagePct}%`} />
                    <MiniMetric label="Open actions" value={String(row.openActions.length)} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline"><Link href="/gsa/monthly-reports"><FileSpreadsheet className="h-4 w-4" />Reports</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link href="/gsa/performance"><BarChart3 className="h-4 w-4" />Performance</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link href="/gsa/tenders"><FileSearch className="h-4 w-4" />Tenders</Link></Button>
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="rounded-lg border border-border-ui bg-surface2 p-5 text-sm text-ink-muted">
                  No airline relationship is active yet. Awarded contracts will appear here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-brand" /> Airline action threads</CardTitle>
            </CardHeader>
            <CardContent>
              <GsaControlActionsClient actions={openActions} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-brand" /> Report exchange</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.slice(0, 6).map((report) => (
                <div key={report.id} className="rounded-lg border border-border-ui bg-surface2 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{report.airline} - {report.period}</p>
                      <p className="mt-1 text-xs text-ink-muted">{report.market} - v{report.version}</p>
                    </div>
                    <Badge variant={reportVariant(report.status)}>{report.status}</Badge>
                  </div>
                  {report.airlineReviewNote && <p className="mt-2 text-sm text-warning">{report.airlineReviewNote}</p>}
                </div>
              ))}
              {reports.length === 0 && (
                <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">No report exchange yet.</div>
              )}
              <Button asChild variant="outline"><Link href="/gsa/monthly-reports"><Send className="h-4 w-4" />Open monthly reports</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-brand" /> Latest airline signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.slice(0, 8).map((notification) => (
                <Link key={notification.id} href={notification.href} className="block rounded-lg border border-border-ui bg-surface2 p-3 transition hover:border-brand/40 hover:bg-surface">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{notification.title}</p>
                      <p className="mt-1 text-sm text-ink-muted">{notification.body}</p>
                    </div>
                    {!notification.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                  </div>
                </Link>
              ))}
              {notifications.length === 0 && (
                <div className="rounded-lg border border-success/25 bg-success-bg p-4 text-sm text-success">
                  No airline signals are waiting.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass = {
    default: "bg-brand-light text-brand",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
  }[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass}`}>{icon}</div>
        <p className="mt-4 text-2xl font-bold text-ink">{value}</p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="mt-1 text-xs font-medium text-ink-muted">{helper}</p>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function riskVariant(risk: "green" | "amber" | "red"): "success" | "warning" | "danger" {
  if (risk === "green") return "success";
  if (risk === "amber") return "warning";
  return "danger";
}

function reportVariant(status: AirlineDeskRow["reportStatus"] | MonthlyContractReport["status"]): "default" | "success" | "warning" | "danger" | "muted" {
  if (status === "accepted") return "success";
  if (status === "submitted") return "default";
  if (status === "changes-requested" || status === "missing") return "warning";
  if (status === "rejected") return "danger";
  return "muted";
}

function reportLabel(status: AirlineDeskRow["reportStatus"]) {
  if (status === "missing") return "report due";
  return status;
}

function riskRank(risk: AirlineDeskRow["riskLevel"]) {
  if (risk === "red") return 3;
  if (risk === "amber") return 2;
  return 1;
}
