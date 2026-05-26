import { AlertTriangle, Award, BarChart3, CheckCircle2, Clock, PackageCheck, Target, TrendingUp, Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  listContractPerformance,
  listControlActions,
  listMandateBookings,
  listMandateQuotes,
  type MandateBooking,
  type MandateQuote,
} from "@/lib/services/mandate-execution-store";
import { listTeamAccounts, type TeamAccount } from "@/lib/services/team-accounts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { GsaControlActionsClient } from "./control-actions-client";

type EmployeePerformanceRow = {
  email: string;
  name: string;
  title: string;
  accessRole: string;
  quoteCount: number;
  bookingCount: number;
  revenueAmount: number;
  tonnageKg: number;
  averageRatePerKg: number;
  winRatePct: number;
  lastBookingAt?: string;
  topRoute: string;
};

export default async function GsaPerformancePage() {
  const session = await getSession();
  const canInspectTeam = Boolean(session && canViewEmployeePerformance(session));
  const [performance, controlActions, quotes, bookings, teamAccounts] = session
    ? await Promise.all([
        listContractPerformance(session),
        listControlActions(session),
        canInspectTeam ? listMandateQuotes(session) : Promise.resolve([]),
        canInspectTeam ? listMandateBookings(session) : Promise.resolve([]),
        canInspectTeam ? listTeamAccounts(session.company, "gsa", session.companyId) : Promise.resolve([]),
      ])
    : [[], [], [], [], []];
  const employeePerformance = session && canInspectTeam ? buildEmployeePerformance(session, teamAccounts, quotes, bookings) : [];
  const teamTotals = employeePerformance.reduce(
    (sum, employee) => ({
      revenue: sum.revenue + employee.revenueAmount,
      tonnageKg: sum.tonnageKg + employee.tonnageKg,
      quoteCount: sum.quoteCount + employee.quoteCount,
      bookingCount: sum.bookingCount + employee.bookingCount,
    }),
    { revenue: 0, tonnageKg: 0, quoteCount: 0, bookingCount: 0 },
  );
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
      <Topbar title="My Performance" subtitle="Live contract scorecard" />
      <main className="space-y-5 p-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue attainment" value={`${revenuePct}%`} sub={`${formatMoney(totals.revenue)} / ${formatMoney(totals.revenueTarget)}`} tone={revenuePct >= 90 ? "success" : revenuePct >= 60 ? "warning" : "danger"} />
          <KpiCard icon={<PackageCheck className="h-5 w-5" />} label="Tonnage attainment" value={`${tonnagePct}%`} sub={`${Math.round(totals.tonnageKg).toLocaleString()} / ${Math.round(totals.tonnageTargetKg).toLocaleString()} kg`} tone={tonnagePct >= 90 ? "success" : tonnagePct >= 60 ? "warning" : "danger"} />
          <KpiCard icon={<Award className="h-5 w-5" />} label="Quote win rate" value={`${winRatePct}%`} sub={`${totals.bookingCount} bookings from ${totals.quoteCount} quotes`} tone={winRatePct >= 35 ? "success" : winRatePct >= 20 ? "warning" : "danger"} />
          <KpiCard icon={<Clock className="h-5 w-5" />} label="SLA breaches" value={String(totals.slaBreaches)} sub={`${totals.pendingApprovals} pending approvals`} tone={totals.slaBreaches === 0 ? "success" : "danger"} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-brand" /> Contract commitments</CardTitle>
            <p className="text-sm text-ink-muted">Targets are controlled by the airline contract and calculated from live quotes and bookings.</p>
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

        {canInspectTeam && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand" />
                Employee performance
              </CardTitle>
              <p className="text-sm text-ink-muted">
                Teamlead and admin view of quote output, bookings, tonnage, revenue, and average selling rate for this month.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <FocusItem label="Team revenue" value={formatMoney(teamTotals.revenue)} />
                <FocusItem label="Team tonnage" value={formatTonnage(teamTotals.tonnageKg)} />
                <FocusItem label="Team bookings" value={String(teamTotals.bookingCount)} />
                <FocusItem label="Team win rate" value={`${teamTotals.quoteCount > 0 ? Math.round((teamTotals.bookingCount / teamTotals.quoteCount) * 100) : 0}%`} />
              </div>
              <div className="overflow-x-auto rounded-xl border border-border-ui">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="border-b border-border-ui bg-surface2 text-xs uppercase tracking-wider text-ink-muted">
                    <tr>
                      {["Employee", "Access", "Quotes", "Bookings", "Revenue", "Tonnage", "Avg rate", "Win rate", "Last booking"].map((header) => (
                        <th key={header} className="px-4 py-3 text-left">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-ui">
                    {employeePerformance.map((employee) => (
                      <tr key={employee.email}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{employee.name}</p>
                          <p className="mt-1 text-xs text-ink-muted">{employee.email}</p>
                          <p className="mt-1 text-xs font-semibold text-brand">{employee.title}</p>
                        </td>
                        <td className="px-4 py-3"><Badge variant={employee.accessRole === "admin" || employee.accessRole === "manager" ? "default" : "muted"}>{employee.accessRole}</Badge></td>
                        <td className="px-4 py-3 font-semibold text-ink">{employee.quoteCount}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{employee.bookingCount}</td>
                        <td className="px-4 py-3 text-ink">{formatMoney(employee.revenueAmount)}</td>
                        <td className="px-4 py-3 text-ink">{formatTonnage(employee.tonnageKg)}</td>
                        <td className="px-4 py-3 text-ink">{employee.averageRatePerKg > 0 ? `EUR ${employee.averageRatePerKg.toFixed(2)}/kg` : "-"}</td>
                        <td className="px-4 py-3 text-ink">{employee.winRatePct}%</td>
                        <td className="px-4 py-3 text-ink-muted">
                          {employee.lastBookingAt ? formatDate(employee.lastBookingAt) : "-"}
                          <span className="mt-1 block text-xs">{employee.topRoute}</span>
                        </td>
                      </tr>
                    ))}
                    {employeePerformance.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-muted">No employee activity for this month yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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

function KpiCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: "success" | "warning" | "danger" }) {
  const colors = {
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[tone]}`}>{icon}</div>
        <p className="mt-4 text-2xl font-bold text-ink">{value}</p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="mt-1 text-xs font-medium text-ink-muted">{sub}</p>
      </CardContent>
    </Card>
  );
}

function FocusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function buildEmployeePerformance(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  teamAccounts: TeamAccount[],
  quotes: MandateQuote[],
  bookings: MandateBooking[],
): EmployeePerformanceRow[] {
  const employees = new Map<string, EmployeePerformanceRow>();
  const { periodStart, periodEnd } = currentMonthRange();
  const activeBookings = bookings.filter((booking) => booking.status !== "cancelled" && isInRange(booking.createdAt, periodStart, periodEnd));
  const bookingByQuoteId = new Map(activeBookings.map((booking) => [booking.quoteId, booking]));
  const routeCounts = new Map<string, Map<string, number>>();

  function ensureEmployee(input: { email?: string; name?: string; title?: string; accessRole?: string }) {
    const email = input.email?.trim().toLowerCase();
    if (!email) return null;
    const existing = employees.get(email);
    if (existing) return existing;
    const row: EmployeePerformanceRow = {
      email,
      name: input.name?.trim() || email,
      title: input.title?.trim() || (email === session.email.toLowerCase() ? currentUserTitle(session) : "Team member"),
      accessRole: input.accessRole || "unassigned",
      quoteCount: 0,
      bookingCount: 0,
      revenueAmount: 0,
      tonnageKg: 0,
      averageRatePerKg: 0,
      winRatePct: 0,
      topRoute: "No bookings",
    };
    employees.set(email, row);
    return row;
  }

  for (const account of teamAccounts) {
    ensureEmployee({
      email: account.email,
      name: account.name,
      title: account.title,
      accessRole: account.accessRole,
    });
  }
  ensureEmployee({
    email: session.email,
    name: session.name,
    title: currentUserTitle(session),
    accessRole: session.accessRole ?? "owner",
  });

  for (const quote of quotes.filter((quote) => isInRange(quote.createdAt, periodStart, periodEnd))) {
    const bookingOwner = bookingByQuoteId.get(quote.id)?.createdBy;
    const employee = ensureEmployee({
      email: quote.createdBy || bookingOwner,
      name: quote.createdByName,
      accessRole: "operator",
    });
    if (!employee) continue;
    employee.quoteCount += 1;
  }

  for (const booking of activeBookings) {
    const employee = ensureEmployee({ email: booking.createdBy, accessRole: "operator" });
    if (!employee) continue;
    const revenue = booking.finalRevenueAmount ?? booking.bookedRevenueAmount ?? booking.revenueAmount;
    employee.bookingCount += 1;
    employee.revenueAmount += revenue;
    employee.tonnageKg += booking.weightKg;
    if (!employee.lastBookingAt || booking.createdAt > employee.lastBookingAt) employee.lastBookingAt = booking.createdAt;

    const route = `${booking.origin}-${booking.destination}`;
    const employeeRoutes = routeCounts.get(employee.email) ?? new Map<string, number>();
    employeeRoutes.set(route, (employeeRoutes.get(route) ?? 0) + 1);
    routeCounts.set(employee.email, employeeRoutes);
  }

  for (const employee of employees.values()) {
    employee.revenueAmount = roundMoney(employee.revenueAmount);
    employee.averageRatePerKg = employee.tonnageKg > 0 ? roundMoney(employee.revenueAmount / employee.tonnageKg) : 0;
    employee.winRatePct = employee.quoteCount > 0 ? Math.round((employee.bookingCount / employee.quoteCount) * 100) : 0;
    const topRoute = [...(routeCounts.get(employee.email)?.entries() ?? [])].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
    employee.topRoute = topRoute ? `Top lane ${topRoute[0]}` : "No bookings";
  }

  return [...employees.values()].sort((left, right) =>
    right.revenueAmount - left.revenueAmount ||
    right.bookingCount - left.bookingCount ||
    right.quoteCount - left.quoteCount ||
    left.name.localeCompare(right.name)
  );
}

function canViewEmployeePerformance(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  return session.role === "gsa" && ["owner", "admin", "manager"].includes(session.accessRole ?? "owner");
}

function currentUserTitle(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  if (session.accessRole === "admin" || session.accessRole === "owner") return "Company admin";
  if (session.accessRole === "manager") return "Team lead";
  if (session.accessRole === "operator") return "Operator";
  return session.role === "gsa" ? "GSA account" : "Account";
}

function riskVariant(risk: "green" | "amber" | "red"): "success" | "warning" | "danger" {
  if (risk === "green") return "success";
  if (risk === "amber") return "warning";
  return "danger";
}

function percent(actual: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

function formatMoney(value: number) {
  return `EUR ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function formatTonnage(value: number) {
  if (value >= 1000) return `${(value / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1 })} t`;
  return `${Math.round(value).toLocaleString("en-GB")} kg`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function currentMonthRange() {
  const now = new Date();
  return {
    periodStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    periodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

function isInRange(value: string, start: string, end: string) {
  return value >= start && value < end;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
