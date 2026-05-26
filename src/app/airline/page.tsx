import { AlertTriangle, ArrowRight, ClipboardCheck, DollarSign, FileSpreadsheet, Gauge, Handshake, PackageCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { AirlineGsaAssignmentSummary } from "@/components/dashboard/airline-gsa-assignment-summary";
import { FlightWorldMap } from "@/components/dashboard/flight-world-map";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getAirlineOperationalPerformanceDashboard } from "@/lib/services/airline-performance-store";
import { getSaudiaFlights } from "@/lib/services/fr24";
import { listMandateQuotes, listMonthlyReports, listWorkflowNotifications } from "@/lib/services/mandate-execution-store";

export const dynamic = "force-dynamic";

const palette = ["#1a5aff", "#06b6d4", "#16a34a", "#f59e0b", "#7c3aed", "#ef4444"];

export default async function AirlineDashboardPage() {
  const session = await getSession();
  const companyName = session?.company?.trim() || "Airline";
  const useLegacySaudiaTracker = isLegacySaudiaCompany(companyName);
  const [{ flights: trackedFlights }, performance, quotes, reports, notifications] = await Promise.all([
    useLegacySaudiaTracker ? getSaudiaFlights() : Promise.resolve({ flights: [] }),
    session ? getAirlineOperationalPerformanceDashboard(session) : null,
    session ? listMandateQuotes(session) : [],
    session ? listMonthlyReports(session) : [],
    session ? listWorkflowNotifications(session) : [],
  ]);
  const latest = performance?.selectedAverage ?? {
    revenue: 0,
    loadFactor: 0,
    yieldPerKg: 0,
    flightCount: 0,
    tonnage: 0,
  };

  const totalRevenue = latest.revenue;
  const totalTonnage = latest.tonnage;
  const gsaRevenue = performance?.gsas.reduce((sum, gsa) => sum + gsa.revenue, 0) ?? 0;
  const directRevenue = 0;
  const gsaPercent = totalRevenue > 0 ? Math.round((gsaRevenue / totalRevenue) * 100) : 0;
  const directPercent = totalRevenue > 0 ? Math.max(0, 100 - gsaPercent) : 0;

  const gsaRows = (performance?.gsas ?? [])
    .map((gsa, index) => ({
      rowKey: `${gsa.gsaName}-${gsa.assignedMarkets}-${index}`,
      name: gsa.gsaName,
      assignedMarkets: gsa.assignedMarkets,
      color: palette[index % palette.length],
      bookings: gsa.flightCount,
      tonnage: gsa.tonnage,
      revenue: gsa.revenue,
      avgLF: gsa.loadFactor,
      avgYield: gsa.yieldPerKg,
    }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxGsaRevenue = gsaRows[0]?.revenue ?? 1;
  const pendingQuoteApprovals = quotes.filter((quote) => quote.status === "airline-approval-required");
  const submittedReports = reports.filter((report) => report.status === "submitted");
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const watchlist = performance?.watchlist ?? [];

  const topRoutes = (performance?.countries ?? [])
    .flatMap((country) =>
      country.airports.flatMap((airport) =>
        airport.routes.map((route) => ({
          ...route,
          country: country.country,
          airportCode: airport.airportCode,
        })),
      ),
    )
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxRouteRevenue = topRoutes[0]?.revenue ?? 1;

  return (
    <>
      <Topbar title="Sales overview" subtitle={companyName} />
      <main className="space-y-6 p-5">
        <FlightWorldMap
          title="Live flight tracker"
          subtitle={useLegacySaudiaTracker
            ? "Live tracked flights worldwide. Commercial performance below is calculated from recorded contract bookings."
            : "Connect airline tracking to populate live aircraft. Commercial performance below is calculated from recorded contract bookings."}
          flights={trackedFlights}
          markerColorMode="seller"
          enableFlightTypeFilter
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Revenue MTD" value={formatEur(latest.revenue)} change="From contract bookings" icon={DollarSign} />
          <KpiCard label="Load factor" value={`${latest.loadFactor}%`} change={`${latest.flightCount} recorded bookings`} icon={PackageCheck} />
          <KpiCard label="Avg yield" value={`EUR ${latest.yieldPerKg.toFixed(2)}/kg`} change="From booked and flown shipments" icon={Gauge} />
          <KpiCard label="Active GSAs" value={String(gsaRows.length)} change={`${trackedFlights.length} live flights tracked`} icon={Handshake} />
        </div>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
          <ControlQueueCard
            title="Quote approvals"
            icon={<ClipboardCheck className="h-5 w-5 text-brand" />}
            href="/airline/contracts"
            cta="Open contracts"
            count={pendingQuoteApprovals.length}
            empty="No quotes waiting for airline approval."
            items={pendingQuoteApprovals.slice(0, 4).map((quote) => ({
              key: quote.id,
              title: `${quote.customer} - ${quote.origin}-${quote.destination}`,
              meta: `${quote.gsaName} - EUR ${quote.requestedRatePerKg.toFixed(2)}/kg - ${quote.weightKg.toLocaleString("en-GB")} kg`,
              badge: "approval",
            }))}
          />
          <ControlQueueCard
            title="Monthly reviews"
            icon={<FileSpreadsheet className="h-5 w-5 text-brand" />}
            href="/airline/contracts"
            cta="Review reports"
            count={submittedReports.length}
            empty="No submitted monthly reports waiting for review."
            items={submittedReports.slice(0, 4).map((report) => ({
              key: report.id,
              title: `${report.gsaName} - ${report.period}`,
              meta: `${report.market} - ${formatEur(report.reportedRevenue)} - ${Math.round(report.reportedTonnageKg).toLocaleString("en-GB")} kg`,
              badge: "submitted",
            }))}
          />
          <ControlQueueCard
            title="Control watchlist"
            icon={<AlertTriangle className="h-5 w-5 text-brand" />}
            href="/airline/performance"
            cta="Open performance"
            count={watchlist.length + unreadNotifications.length}
            empty="No active control watchlist items."
            items={[
              ...unreadNotifications.slice(0, 2).map((notification) => ({
                key: notification.id,
                title: notification.title,
                meta: notification.type,
                badge: "unread",
              })),
              ...watchlist.slice(0, 4).map((item) => ({
                key: item,
                title: item,
                meta: "Operational signal",
                badge: "watch",
              })),
            ].slice(0, 5)}
          />
        </section>

        <AirlineGsaAssignmentSummary />

        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle>Sales by channel</CardTitle>
              <p className="text-sm text-ink-muted">Revenue split from recorded operational bookings. Direct airline sales appear once connected.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div className="bg-brand transition-all" style={{ width: `${directPercent}%` }} />
                  <div className="bg-cyan-accent transition-all" style={{ width: `${gsaPercent}%` }} />
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-brand" />
                    Airline direct
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-cyan-accent" />
                    GSA contract bookings
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <ChannelRow label="Airline direct" color="bg-brand" count={0} countLabel="bookings" revenue={directRevenue} percent={directPercent} />
                <ChannelRow label="GSA contract bookings" color="bg-cyan-accent" count={latest.flightCount} countLabel="bookings" revenue={gsaRevenue} percent={gsaPercent} />
              </div>

              <div className="flex items-center justify-between border-t border-border-ui pt-4">
                <div>
                  <p className="text-xs text-ink-muted">Recorded revenue</p>
                  <p className="mt-0.5 text-lg font-bold text-ink">{formatEur(totalRevenue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-muted">Recorded tonnage</p>
                  <p className="mt-0.5 text-lg font-bold text-ink">{totalTonnage.toFixed(1)} t</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Top routes</CardTitle>
                <p className="mt-0.5 text-sm text-ink-muted">Ranked by booked and flown contract revenue</p>
              </div>
              <TrendingUp className="h-4 w-4 text-ink-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              {topRoutes.map((route, index) => (
                <div key={`${route.route}-${route.airportCode}`} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-xs font-semibold text-ink-muted">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1 font-semibold text-ink">
                        <span>{route.route.split("-")[0] ?? route.airportCode}</span>
                        <ArrowRight className="h-3 w-3 text-ink-muted" />
                        <span>{route.destination}</span>
                        <span className="ml-1 font-normal text-ink-muted">{route.country}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-ink">{formatEur(route.revenue)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${(route.revenue / maxRouteRevenue) * 100}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] text-ink-muted">{route.loadFactor}% LF</span>
                    </div>
                  </div>
                </div>
              ))}
              {topRoutes.length === 0 && <p className="text-sm text-ink-muted">No booked route revenue yet.</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>GSA sales performance</CardTitle>
              <p className="mt-0.5 text-sm text-ink-muted">Revenue, tonnage and load factor per GSA partner from contract bookings</p>
            </div>
            <Link href="/airline/gsa/overview" className="text-xs font-semibold text-brand hover:underline">
              View all GSAs
            </Link>
          </CardHeader>
          <CardContent>
            <div className="mb-2 grid grid-cols-[1fr_70px_80px_90px_52px_80px] gap-3 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              <span>GSA partner</span>
              <span className="text-right">Bookings</span>
              <span className="text-right">Tonnage</span>
              <span className="text-right">Revenue</span>
              <span className="text-right">Avg LF</span>
              <span className="text-right">Avg yield</span>
            </div>

            <div className="space-y-1">
              {gsaRows.map((gsa) => (
                <div
                  key={gsa.rowKey}
                  className="grid grid-cols-[1fr_70px_80px_90px_52px_80px] items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-border-ui hover:bg-surface2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: gsa.color }} />
                      <span className="truncate text-sm font-semibold text-ink">{gsa.name}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-muted">{gsa.assignedMarkets}</p>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface2">
                      <div className="h-full rounded-full opacity-60" style={{ width: `${(gsa.revenue / maxGsaRevenue) * 100}%`, backgroundColor: gsa.color }} />
                    </div>
                  </div>

                  <span className="text-right text-sm font-medium text-ink">{gsa.bookings}</span>
                  <span className="text-right text-sm font-medium text-ink">{gsa.tonnage.toFixed(1)} t</span>
                  <span className="text-right text-sm font-semibold text-ink">{formatEur(gsa.revenue)}</span>
                  <LfBadge value={gsa.avgLF} />
                  <span className="text-right text-sm font-medium text-ink">EUR {gsa.avgYield.toFixed(2)}/kg</span>
                </div>
              ))}
              {gsaRows.length === 0 && <p className="rounded-xl border border-border-ui bg-surface2 px-3 py-4 text-sm text-ink-muted">No GSA booking performance recorded yet.</p>}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function ControlQueueCard({
  title,
  icon,
  href,
  cta,
  count,
  empty,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  cta: string;
  count: number;
  empty: string;
  items: Array<{ key: string; title: string; meta: string; badge: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
          <Badge variant={count > 0 ? "warning" : "success"}>{count}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? items.map((item) => (
          <div key={item.key} className="rounded-lg border border-border-ui bg-surface2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted">{item.badge}</Badge>
              <span className="text-xs text-ink-muted">{item.meta}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold text-ink">{item.title}</p>
          </div>
        )) : (
          <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">{empty}</div>
        )}
        <Button asChild size="sm" variant="outline"><Link href={href}>{cta}</Link></Button>
      </CardContent>
    </Card>
  );
}

function ChannelRow({
  label,
  color,
  count,
  countLabel,
  revenue,
  percent,
}: {
  label: string;
  color: string;
  count: number;
  countLabel: string;
  revenue: number;
  percent: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border-ui bg-surface2 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <div>
          <p className="text-xs font-semibold text-ink">{label}</p>
          <p className="text-[11px] text-ink-muted">
            {count} {count === 1 ? countLabel.replace(/s$/, "") : countLabel}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-ink">{formatEur(revenue)}</p>
        <p className="text-[11px] font-semibold text-ink-muted">{percent}% of total</p>
      </div>
    </div>
  );
}

function LfBadge({ value }: { value: number }) {
  const color =
    value >= 85
      ? "text-success bg-success/10"
      : value >= 70
        ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
        : "text-ink-muted bg-surface2";

  return (
    <span className={`ml-auto block w-fit rounded-md px-1.5 py-0.5 text-right text-xs font-semibold ${color}`}>
      {value}%
    </span>
  );
}

function formatEur(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function isLegacySaudiaCompany(companyName: string) {
  return /\bsaudia\b|\bsaudi\b/i.test(companyName);
}
