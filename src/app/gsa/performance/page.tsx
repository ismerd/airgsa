import { Award, BarChart3, BellRing, CheckCircle2, Clock, Inbox, PackageCheck, Target, TrendingUp, Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getGsaPerformanceData } from "@/lib/services/mandate-execution-store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import {
  ActionLink,
  KpiCard,
  MonthlyTrendCard,
  RhythmItem,
  buildMonthlyTrend,
  buildOperatingRhythm,
  canViewEmployeePerformance,
  formatMoney,
  formatTonnage,
  percent,
} from "./performance-shared";

export default async function GsaPerformanceOverviewPage() {
  const session = await getSession();
  const canInspectTeam = Boolean(session && canViewEmployeePerformance(session));
  const performanceData = session ? await getGsaPerformanceData(session) : { performance: [], controlActions: [], quotes: [], bookings: [] };
  const { performance, quotes, bookings } = performanceData;
  const operatingRhythm = buildOperatingRhythm(quotes, bookings);
  const monthlyTrend = buildMonthlyTrend(quotes, bookings);
  const thisMonth = operatingRhythm.find((row) => row.label === "This month") ?? {
    label: "This month",
    quoteCount: 0,
    bookingCount: 0,
    revenueAmount: 0,
    tonnageKg: 0,
    winRatePct: 0,
  };
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
  const openQuotes = quotes.filter((quote) => !["airline-rejected", "declined", "expired"].includes(quote.status)).length;
  const atRiskContracts = performance.filter((item) => item.riskLevel !== "green");

  return (
    <>
      <Topbar
        title={canInspectTeam ? "Performance Overview" : "My Sales"}
        subtitle={canInspectTeam ? "Short view of sales, targets and trend" : "Your assigned customers, quotes and bookings"}
      />
      <main className="space-y-5 p-5">
        {canInspectTeam ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue attainment" value={`${revenuePct}%`} sub={`${formatMoney(totals.revenue)} / ${formatMoney(totals.revenueTarget)}`} tone={revenuePct >= 90 ? "success" : revenuePct >= 60 ? "warning" : "danger"} />
            <KpiCard icon={<PackageCheck className="h-5 w-5" />} label="Tonnage attainment" value={`${tonnagePct}%`} sub={`${Math.round(totals.tonnageKg).toLocaleString()} / ${Math.round(totals.tonnageTargetKg).toLocaleString()} kg`} tone={tonnagePct >= 90 ? "success" : tonnagePct >= 60 ? "warning" : "danger"} />
            <KpiCard icon={<Award className="h-5 w-5" />} label="Quote win rate" value={`${winRatePct}%`} sub={`${totals.bookingCount} bookings from ${totals.quoteCount} quotes`} tone={winRatePct >= 35 ? "success" : winRatePct >= 20 ? "warning" : "danger"} />
            <KpiCard icon={<Clock className="h-5 w-5" />} label="SLA breaches" value={String(totals.slaBreaches)} sub={`${totals.pendingApprovals} pending approvals`} tone={totals.slaBreaches === 0 ? "success" : "danger"} />
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue this month" value={formatMoney(thisMonth.revenueAmount)} sub={`${thisMonth.bookingCount} booked shipments`} tone={thisMonth.revenueAmount > 0 ? "success" : "warning"} />
            <KpiCard icon={<PackageCheck className="h-5 w-5" />} label="Tonnage this month" value={formatTonnage(thisMonth.tonnageKg)} sub="From your assigned customers" tone={thisMonth.tonnageKg > 0 ? "success" : "warning"} />
            <KpiCard icon={<Award className="h-5 w-5" />} label="Quote win rate" value={`${thisMonth.winRatePct}%`} sub={`${thisMonth.bookingCount} bookings from ${thisMonth.quoteCount} quotes`} tone={thisMonth.winRatePct >= 35 ? "success" : thisMonth.quoteCount > 0 ? "warning" : "danger"} />
            <KpiCard icon={<Inbox className="h-5 w-5" />} label="Open opportunities" value={String(openQuotes)} sub="Quotes you can still move" tone={openQuotes > 0 ? "warning" : "success"} />
          </section>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand" /> Daily and weekly rhythm</CardTitle>
            <p className="text-sm text-ink-muted">
              {canInspectTeam ? "Company activity for today, the last 7 days, and the current month." : "Your activity for today, the last 7 days, and the current month."}
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {operatingRhythm.map((row) => (
              <RhythmItem key={row.label} row={row} />
            ))}
          </CardContent>
        </Card>

        {canInspectTeam ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-brand" /> Performance areas</CardTitle>
              <p className="text-sm text-ink-muted">Use the overview for direction. Open the detailed pages only when you need employee or airline detail.</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <ActionLink href="/gsa/performance/team" icon={<Users className="h-4 w-4" />} label="Team Performance" value={`${totals.bookingCount} bookings this month`} />
              <ActionLink href="/gsa/performance/airlines" icon={<Target className="h-4 w-4" />} label="Airline Targets" value={`${atRiskContracts.length} contracts at risk`} />
              <div className="rounded-lg border border-border-ui bg-surface2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">Current focus</p>
                  <Badge variant={atRiskContracts.length > 0 ? "warning" : "success"}>{atRiskContracts.length > 0 ? "Watch" : "On track"}</Badge>
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  {atRiskContracts.length > 0 ? "Open airline target risks and assign sales focus before the week closes." : "No airline target risk is currently above threshold."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Next sales moves</CardTitle>
              <p className="text-sm text-ink-muted">Only the work areas an operator needs to move assigned customers forward.</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <ActionLink href="/gsa/quotes" icon={<Inbox className="h-4 w-4" />} label="Reply and quote" value={`${openQuotes} open`} />
              <ActionLink href="/gsa/capacity-alerts" icon={<BellRing className="h-4 w-4" />} label="Sell capacity alerts" value="Airline capacity" />
              <ActionLink href="/gsa/customers" icon={<Users className="h-4 w-4" />} label="Assigned customers" value="Portfolio" />
              <ActionLink href="/gsa/shipments" icon={<PackageCheck className="h-4 w-4" />} label="Track shipments" value="AWB status" />
            </CardContent>
          </Card>
        )}

        <MonthlyTrendCard
          rows={monthlyTrend}
          title={canInspectTeam ? "Monthly sales trend" : "Your monthly sales trend"}
          subtitle={canInspectTeam ? "Revenue, tonnage, bookings, and win rate across the last six months." : "Your assigned customer revenue, tonnage, bookings, and win rate across the last six months."}
        />
      </main>
    </>
  );
}
