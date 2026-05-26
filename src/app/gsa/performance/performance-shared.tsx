import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, TrendingUp } from "lucide-react";
import type { getSession } from "@/lib/auth/session";
import type { MandateBooking, MandateQuote } from "@/lib/services/mandate-execution-store";
import type { TeamAccount } from "@/lib/services/team-accounts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type EmployeePerformanceRow = {
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

export type OperatingRhythmRow = {
  label: string;
  quoteCount: number;
  bookingCount: number;
  revenueAmount: number;
  tonnageKg: number;
  winRatePct: number;
};

export type MonthlyTrendRow = OperatingRhythmRow & {
  period: string;
};

export function KpiCard({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: string; sub: string; tone: "success" | "warning" | "danger" }) {
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

export function FocusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

export function RhythmItem({ row }: { row: OperatingRhythmRow }) {
  const tone = row.bookingCount > 0 ? "success" : row.quoteCount > 0 ? "warning" : "muted";
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{row.label}</p>
        <Badge variant={tone}>{row.winRatePct}% won</Badge>
      </div>
      <p className="mt-3 text-xl font-bold text-ink">{formatMoney(row.revenueAmount)}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Quotes" value={String(row.quoteCount)} />
        <MiniStat label="Bookings" value={String(row.bookingCount)} />
        <MiniStat label="Tonnage" value={formatTonnage(row.tonnageKg)} />
      </div>
    </div>
  );
}

export function ActionLink({ href, icon, label, value }: { href: string; icon: ReactNode; label: string; value: string }) {
  return (
    <Button asChild variant="outline" className="h-auto justify-between p-4">
      <Link href={href} className="group min-w-0">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">{icon}</span>
          <span className="min-w-0 text-left">
            <span className="block truncate text-sm font-semibold text-ink">{label}</span>
            <span className="mt-0.5 block truncate text-xs text-ink-muted">{value}</span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
      </Link>
    </Button>
  );
}

export function MonthlyTrendCard({ rows, title, subtitle }: { rows: MonthlyTrendRow[]; title: string; subtitle: string }) {
  const maxRevenue = Math.max(1, ...rows.map((row) => row.revenueAmount));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-brand" /> {title}</CardTitle>
        <p className="text-sm text-ink-muted">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.period} className="grid gap-3 rounded-lg border border-border-ui bg-surface2 p-3 md:grid-cols-[100px_minmax(0,1fr)_90px_90px_90px] md:items-center">
            <div>
              <p className="text-sm font-semibold text-ink">{formatMonth(row.period)}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{row.winRatePct}% won</p>
            </div>
            <div className="min-w-0">
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, Math.round((row.revenueAmount / maxRevenue) * 100))}%` }} />
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-ink">{formatMoney(row.revenueAmount)}</p>
            </div>
            <MiniStat label="Quotes" value={String(row.quoteCount)} />
            <MiniStat label="Bookings" value={String(row.bookingCount)} />
            <MiniStat label="Tonnage" value={formatTonnage(row.tonnageKg)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

export function buildOperatingRhythm(quotes: MandateQuote[], bookings: MandateBooking[]): OperatingRhythmRow[] {
  const todayStart = startOfUtcDay(new Date());
  const tomorrowStart = addUtcDays(todayStart, 1);
  const weekStart = addUtcDays(todayStart, -6);
  const month = currentMonthRange();

  return [
    summarizePeriod("Today", todayStart.toISOString(), tomorrowStart.toISOString(), quotes, bookings),
    summarizePeriod("Last 7 days", weekStart.toISOString(), tomorrowStart.toISOString(), quotes, bookings),
    summarizePeriod("This month", month.periodStart, month.periodEnd, quotes, bookings),
  ];
}

export function buildMonthlyTrend(quotes: MandateQuote[], bookings: MandateBooking[]): MonthlyTrendRow[] {
  const now = new Date();
  const rows: MonthlyTrendRow[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const period = start.toISOString().slice(0, 7);
    rows.push({
      ...summarizePeriod(formatMonth(period), start.toISOString(), end.toISOString(), quotes, bookings),
      period,
    });
  }

  return rows;
}

function summarizePeriod(label: string, periodStart: string, periodEnd: string, quotes: MandateQuote[], bookings: MandateBooking[]): OperatingRhythmRow {
  const periodQuotes = quotes.filter((quote) => isInRange(quote.createdAt, periodStart, periodEnd));
  const periodBookings = bookings.filter((booking) => booking.status !== "cancelled" && isInRange(booking.createdAt, periodStart, periodEnd));
  const revenueAmount = roundMoney(periodBookings.reduce((sum, booking) => sum + (booking.finalRevenueAmount ?? booking.bookedRevenueAmount ?? booking.revenueAmount), 0));
  const tonnageKg = periodBookings.reduce((sum, booking) => sum + (booking.flownWeightKg ?? booking.bookedWeightKg ?? booking.weightKg), 0);

  return {
    label,
    quoteCount: periodQuotes.length,
    bookingCount: periodBookings.length,
    revenueAmount,
    tonnageKg,
    winRatePct: periodQuotes.length > 0 ? Math.round((periodBookings.length / periodQuotes.length) * 100) : 0,
  };
}

export function buildEmployeePerformance(
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

export function canViewEmployeePerformance(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  return session.role === "gsa" && ["owner", "admin", "manager"].includes(session.accessRole ?? "owner");
}

function currentUserTitle(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  if (session.accessRole === "admin" || session.accessRole === "owner") return "Company admin";
  if (session.accessRole === "manager") return "Team lead";
  if (session.accessRole === "operator") return "Operator";
  return session.role === "gsa" ? "GSA account" : "Account";
}

export function riskVariant(risk: "green" | "amber" | "red"): "success" | "warning" | "danger" {
  if (risk === "green") return "success";
  if (risk === "amber") return "warning";
  return "danger";
}

export function percent(actual: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

export function formatMoney(value: number) {
  return `EUR ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

export function formatTonnage(value: number) {
  if (value >= 1000) return `${(value / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1 })} t`;
  return `${Math.round(value).toLocaleString("en-GB")} kg`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatMonth(period: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00.000Z`));
}

function currentMonthRange() {
  const now = new Date();
  return {
    periodStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    periodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isInRange(value: string, start: string, end: string) {
  return value >= start && value < end;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
