import { AlertTriangle, Award, BarChart3, CheckCircle2, Clock, PackageCheck, Target, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getGsaPerformanceData } from "@/lib/services/mandate-execution-store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { GsaControlActionsClient } from "../control-actions-client";
import {
  FocusItem,
  KpiCard,
  canViewEmployeePerformance,
  formatMoney,
  percent,
  riskVariant,
} from "../performance-shared";

export default async function GsaAirlineTargetsPage() {
  const session = await getSession();
  if (!session || !canViewEmployeePerformance(session)) redirect("/gsa/performance");

  const { performance, controlActions } = await getGsaPerformanceData(session);
  const totals = performance.reduce(
    (sum, item) => ({
      revenue: sum.revenue + item.revenueAmount,
      revenueTarget: sum.revenueTarget + item.revenueTarget,
      tonnageKg: sum.tonnageKg + item.tonnageKg,
      tonnageTargetKg: sum.tonnageTargetKg + item.tonnageTargetKg,
      quoteCount: sum.quoteCount + item.quoteCount,
      bookingCount: sum.bookingCount + item.bookingCount,
      pendingApprovals: sum.pendingApprovals + item.pendingApprovalCount,
      slaBreaches: sum.slaBreaches + item.slaBreachCount,
    }),
    { revenue: 0, revenueTarget: 0, tonnageKg: 0, tonnageTargetKg: 0, quoteCount: 0, bookingCount: 0, pendingApprovals: 0, slaBreaches: 0 },
  );
  const revenuePct = percent(totals.revenue, totals.revenueTarget);
  const tonnagePct = percent(totals.tonnageKg, totals.tonnageTargetKg);
  const winRatePct = totals.quoteCount > 0 ? Math.round((totals.bookingCount / totals.quoteCount) * 100) : 0;
  const atRiskContracts = performance.filter((item) => item.riskLevel !== "green");

  return (
    <>
      <Topbar title="Airline Targets" subtitle="Contract goals, route risk and airline control actions" />
      <main className="space-y-5 p-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue attainment" value={`${revenuePct}%`} sub={`${formatMoney(totals.revenue)} / ${formatMoney(totals.revenueTarget)}`} tone={revenuePct >= 90 ? "success" : revenuePct >= 60 ? "warning" : "danger"} />
          <KpiCard icon={<PackageCheck className="h-5 w-5" />} label="Tonnage attainment" value={`${tonnagePct}%`} sub={`${Math.round(totals.tonnageKg).toLocaleString()} / ${Math.round(totals.tonnageTargetKg).toLocaleString()} kg`} tone={tonnagePct >= 90 ? "success" : tonnagePct >= 60 ? "warning" : "danger"} />
          <KpiCard icon={<Award className="h-5 w-5" />} label="Quote win rate" value={`${winRatePct}%`} sub={`${totals.bookingCount} bookings from ${totals.quoteCount} quotes`} tone={winRatePct >= 35 ? "success" : winRatePct >= 20 ? "warning" : "danger"} />
          <KpiCard icon={<Clock className="h-5 w-5" />} label="SLA breaches" value={String(totals.slaBreaches)} sub={`${totals.pendingApprovals} pending approvals`} tone={totals.slaBreaches === 0 ? "success" : "danger"} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-brand" /> Airline target commitments</CardTitle>
            <p className="text-sm text-ink-muted">Load, tonnage, revenue, quote volume and win-rate targets controlled by active airline contracts.</p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-border-ui bg-surface2 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  {["Airline", "Market", "Risk", "Revenue", "Tonnage", "Win rate", "Quotes"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ui">
                {performance.map((item) => (
                  <tr key={item.contractId}>
                    <td className="px-4 py-3 font-semibold text-ink">{item.airline}</td>
                    <td className="px-4 py-3 text-ink-muted">{item.market}</td>
                    <td className="px-4 py-3"><Badge variant={riskVariant(item.riskLevel)}>{item.riskLevel}</Badge></td>
                    <td className="px-4 py-3 text-ink">{item.revenueAttainmentPct}% <span className="text-ink-muted">({formatMoney(item.revenueAmount)})</span></td>
                    <td className="px-4 py-3 text-ink">{item.tonnageAttainmentPct}% <span className="text-ink-muted">({Math.round(item.tonnageKg).toLocaleString()} kg)</span></td>
                    <td className="px-4 py-3 text-ink">{item.winRatePct}% <span className="text-ink-muted">target {item.winRateTargetPct}%</span></td>
                    <td className="px-4 py-3 text-ink">{item.quoteCount} <span className="text-ink-muted">target {item.quoteTarget}</span></td>
                  </tr>
                ))}
                {performance.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-muted">No active contract performance yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Airline control actions</CardTitle>
            </CardHeader>
            <CardContent>
              <GsaControlActionsClient actions={controlActions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand" /> Route risk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {performance.flatMap((item) => item.routePerformance.filter((route) => route.assigned && route.riskLevel !== "green").map((route) => (
                <div key={`${item.contractId}-${route.routeId}`} className="rounded-lg border border-border-ui bg-surface2 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{route.origin}-{route.destination}</p>
                    <Badge variant={riskVariant(route.riskLevel)}>{route.riskLevel}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{route.quoteCount} quotes, {route.bookingCount} bookings, {formatMoney(route.revenueAmount)}</p>
                </div>
              )))}
              {atRiskContracts.length === 0 && (
                <div className="rounded-lg border border-success/25 bg-success-bg p-4 text-sm text-success">
                  Assigned routes are currently within control thresholds.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> What matters this month</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <FocusItem label="Close revenue gap" value={formatMoney(Math.max(0, totals.revenueTarget - totals.revenue))} />
            <FocusItem label="Book remaining tonnage" value={`${Math.max(0, Math.round(totals.tonnageTargetKg - totals.tonnageKg)).toLocaleString()} kg`} />
            <FocusItem label="Convert open quotes" value={`${Math.max(0, totals.quoteCount - totals.bookingCount)} open opportunities`} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
