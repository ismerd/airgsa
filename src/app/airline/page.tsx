import { ArrowRight, DollarSign, Gauge, Handshake, PackageCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { AirlineGsaAssignmentSummary } from "@/components/dashboard/airline-gsa-assignment-summary";
import { FlightWorldMap } from "@/components/dashboard/flight-world-map";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSaudiaFlights } from "@/lib/services/fr24";
import { kpiSeries } from "@/lib/services/platform";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic"; // always server-render; live flight fetch has its own 5-min cache

export default async function AirlineDashboardPage() {
  const latest = kpiSeries.at(-1)!;
  const { flights: trackedFlights } = await getSaudiaFlights();

  // Sales channel split
  const totalRevenue = trackedFlights.reduce((s, f) => s + f.revenue, 0);
  const totalTonnage = trackedFlights.reduce((s, f) => s + f.tonnage, 0);
  const gsaFlights = trackedFlights.filter((f) => f.soldBy === "gsa");
  const directFlights = trackedFlights.filter((f) => f.soldBy === "airline");
  const gsaRevenue = gsaFlights.reduce((s, f) => s + f.revenue, 0);
  const directRevenue = directFlights.reduce((s, f) => s + f.revenue, 0);
  const gsaPercent = totalRevenue > 0 ? Math.round((gsaRevenue / totalRevenue) * 100) : 0;
  const directPercent = 100 - gsaPercent;

  // GSA performance rows
  const gsaMap: Record<
    string,
    { name: string; color: string; flights: number; tonnage: number; revenue: number; lfSum: number; yieldSum: number }
  > = {};
  for (const f of trackedFlights) {
    if (!gsaMap[f.gsaName]) {
      gsaMap[f.gsaName] = {
        name: f.gsaName,
        color: f.gsaColor,
        flights: 0,
        tonnage: 0,
        revenue: 0,
        lfSum: 0,
        yieldSum: 0,
      };
    }
    gsaMap[f.gsaName].flights++;
    gsaMap[f.gsaName].tonnage += f.tonnage;
    gsaMap[f.gsaName].revenue += f.revenue;
    gsaMap[f.gsaName].lfSum += f.loadFactor;
    gsaMap[f.gsaName].yieldSum += f.averageYield;
  }
  const gsaRows = Object.values(gsaMap)
    .map((g) => ({ ...g, avgLF: Math.round(g.lfSum / g.flights), avgYield: g.yieldSum / g.flights }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxGsaRevenue = gsaRows[0]?.revenue ?? 1;

  // Top routes
  const topRoutes = [...trackedFlights].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const maxRouteRevenue = topRoutes[0]?.revenue ?? 1;

  return (
    <>
      <Topbar
        title="Sales overview"
        subtitle="Saudia Cargo"
      />
      <main className="space-y-6 p-5">
        <FlightWorldMap
          title="Live flight tracker"
          subtitle="Active Saudia flights worldwide, including passenger aircraft used for belly cargo and pure cargo aircraft."
          flights={trackedFlights}
          markerColorMode="seller"
          enableFlightTypeFilter
        />

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Revenue MTD" value={formatCurrency(latest.revenue)} change="+14.6% vs prior month" icon={DollarSign} />
          <KpiCard label="Load factor" value={`${latest.loadfactor}%`} change="+3 pts on focus lanes" icon={PackageCheck} />
          <KpiCard label="Avg yield" value={`$${latest.yield.toFixed(2)}/kg`} change="+6.1% blended yield" icon={Gauge} />
          <KpiCard label="Active GSAs" value={String(gsaRows.length)} change={`${trackedFlights.length} flights tracked`} icon={Handshake} />
        </div>

        <AirlineGsaAssignmentSummary />

        {/* Channel split + Top routes */}
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle>Sales by channel</CardTitle>
              <p className="text-sm text-ink-muted">Revenue split between direct Saudia Cargo sales and GSA-managed capacity</p>
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
                    GSA sold
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <ChannelRow label="Airline direct" color="bg-brand" flights={directFlights.length} revenue={directRevenue} percent={directPercent} />
                <ChannelRow label="GSA sold" color="bg-cyan-accent" flights={gsaFlights.length} revenue={gsaRevenue} percent={gsaPercent} />
              </div>

              <div className="flex items-center justify-between border-t border-border-ui pt-4">
                <div>
                  <p className="text-xs text-ink-muted">Total revenue (est.)</p>
                  <p className="mt-0.5 text-lg font-bold text-ink">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-muted">Total tonnage (est.)</p>
                  <p className="mt-0.5 text-lg font-bold text-ink">{totalTonnage.toFixed(1)} t</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Top routes</CardTitle>
                <p className="mt-0.5 text-sm text-ink-muted">Ranked by estimated revenue — active flights</p>
              </div>
              <TrendingUp className="h-4 w-4 text-ink-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              {topRoutes.map((flight, i) => (
                <div key={flight.id} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-xs font-semibold text-ink-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1 font-semibold text-ink">
                        <span>{flight.origin.airportCode}</span>
                        <ArrowRight className="h-3 w-3 text-ink-muted" />
                        <span>{flight.destination.airportCode}</span>
                        <span className="ml-1 font-normal text-ink-muted">{flight.flightNumber}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-ink">{formatCurrency(flight.revenue)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(flight.revenue / maxRouteRevenue) * 100}%`,
                            backgroundColor: flight.airlineColor,
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] text-ink-muted">{flight.loadFactor}% LF</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* GSA performance table */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>GSA sales performance</CardTitle>
              <p className="mt-0.5 text-sm text-ink-muted">
                Estimated revenue, tonnage and load factor per GSA partner
              </p>
            </div>
            <Link href="/airline/gsa/overview" className="text-xs font-semibold text-brand hover:underline">
              View all GSAs
            </Link>
          </CardHeader>
          <CardContent>
            <div className="mb-2 grid grid-cols-[1fr_60px_80px_90px_52px_70px] gap-3 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              <span>GSA partner</span>
              <span className="text-right">Flights</span>
              <span className="text-right">Tonnage</span>
              <span className="text-right">Revenue</span>
              <span className="text-right">Avg LF</span>
              <span className="text-right">Avg yield</span>
            </div>

            <div className="space-y-1">
              {gsaRows.map((gsa) => (
                <div
                  key={gsa.name}
                  className="grid grid-cols-[1fr_60px_80px_90px_52px_70px] items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-border-ui hover:bg-surface2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: gsa.color }} />
                      <span className="truncate text-sm font-semibold text-ink">{gsa.name}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface2">
                      <div
                        className="h-full rounded-full opacity-60"
                        style={{ width: `${(gsa.revenue / maxGsaRevenue) * 100}%`, backgroundColor: gsa.color }}
                      />
                    </div>
                  </div>

                  <span className="text-right text-sm font-medium text-ink">{gsa.flights}</span>
                  <span className="text-right text-sm font-medium text-ink">{gsa.tonnage.toFixed(1)} t</span>
                  <span className="text-right text-sm font-semibold text-ink">{formatCurrency(gsa.revenue)}</span>
                  <LfBadge value={gsa.avgLF} />
                  <span className="text-right text-sm font-medium text-ink">${gsa.avgYield.toFixed(2)}/kg</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function ChannelRow({
  label,
  color,
  flights,
  revenue,
  percent,
}: {
  label: string;
  color: string;
  flights: number;
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
            {flights} {flights === 1 ? "flight" : "flights"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-ink">{formatCurrency(revenue)}</p>
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
