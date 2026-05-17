import { Activity, Award, BarChart3, Clock, Target, TrendingUp } from "lucide-react";
import { ChartSection } from "@/components/dashboard/chart-section";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyProvider } from "@/lib/currency-context";
import { kpiSeries } from "@/lib/services/platform";

const MY_KPIS = [
  {
    label: "Quotes This Month",
    value: "24",
    sub: "+4 vs last month",
    trend: "up" as const,
    icon: Target,
  },
  {
    label: "Win Rate",
    value: "71%",
    sub: "+5 pp vs last month",
    trend: "up" as const,
    icon: Award,
  },
  {
    label: "Avg Response Time",
    value: "1.8h",
    sub: "Target 2.0h ✓",
    trend: "up" as const,
    icon: Clock,
  },
  {
    label: "Revenue This Month",
    value: "€286k",
    sub: "Target €250k — 114%",
    trend: "up" as const,
    icon: TrendingUp,
  },
];

const TOP_ACCOUNTS = [
  { name: "Fashion Logistics", revenue: "€533k", volume: "100,970 kg", trend: "+13.9%" },
  { name: "DHL Express", revenue: "€98k", volume: "82,310 kg", trend: "-9.8%" },
  { name: "DSV Air & Sea", revenue: "€96k", volume: "52,637 kg", trend: "-14.1%" },
  { name: "Tracosa", revenue: "€94k", volume: "63,968 kg", trend: "-5.8%" },
  { name: "Universal Global", revenue: "€81k", volume: "72,035 kg", trend: "+7.7%" },
];

export default function GsaPerformancePage() {
  const gsaData = kpiSeries.map((point) => ({ ...point, revenue: Math.round(point.revenue * 0.42) }));

  return (
    <CurrencyProvider>
      <Topbar title="My Performance" subtitle="Personal commercial scorecard" />
      <main className="space-y-5 p-5">
        {/* Personal KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MY_KPIS.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </section>

        {/* FAB Ratio */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light">
                  <Activity className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Flown As Booked Ratio (FAB)</p>
                  <p className="mt-0.5 text-2xl font-bold text-ink">91% <span className="text-sm font-medium text-success">↑ above 88% benchmark</span></p>
                  <p className="text-xs text-ink-muted">Shipments loaded on the originally booked flight vs. total booked</p>
                </div>
              </div>
              <div className="min-w-[200px]">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Industry benchmark</span>
                  <span className="font-bold text-success">91% / 88%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand to-success" style={{ width: "91%" }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-ink-muted">
                  <span>0%</span>
                  <span className="text-warning">Benchmark 88%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border-ui pt-4">
              <div className="text-center">
                <p className="text-lg font-bold text-ink">148</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Shipments Booked</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-success">135</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Flown As Booked</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-danger">13</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Offloaded / Delayed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target progress bar */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Monthly revenue target</p>
                <p className="mt-1 text-2xl font-bold text-ink">€286k <span className="text-sm font-medium text-ink-muted">of €250k target</span></p>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-success" />
                <span className="text-lg font-bold text-success">114%</span>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface2">
              <div className="h-full w-[114%] max-w-full rounded-full bg-gradient-to-r from-brand to-success" />
            </div>
            <div className="mt-2 flex justify-between text-xs text-ink-muted">
              <span>€0</span>
              <span className="text-ink">Target: €250k</span>
              <span className="font-semibold text-success">€286k ✓</span>
            </div>
          </CardContent>
        </Card>

        {/* Chart + Top accounts */}
        <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
          <div>
            <ChartSection allData={gsaData} />
          </div>

          <Card>
            <CardContent className="p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">Top Accounts by Revenue</p>
              <div className="space-y-3">
                {TOP_ACCOUNTS.map((account, index) => (
                  <div key={account.name} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface2 text-[11px] font-bold text-ink-muted">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{account.name}</p>
                      <p className="text-xs text-ink-muted">{account.volume}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink">{account.revenue}</p>
                      <p className={`text-xs font-semibold ${account.trend.startsWith("+") ? "text-success" : "text-danger"}`}>
                        {account.trend}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </CurrencyProvider>
  );
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  trend: "up" | "down" | "neutral";
  icon: React.ElementType;
}) {
  const colors = {
    up: "bg-success-bg text-success",
    down: "bg-danger-bg text-danger",
    neutral: "bg-brand-light text-brand",
  };
  const subColors = {
    up: "text-success",
    down: "text-danger",
    neutral: "text-ink-muted",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[trend]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-4 text-2xl font-bold text-ink">{value}</p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className={`mt-1 text-xs font-medium ${subColors[trend]}`}>{sub}</p>
      </CardContent>
    </Card>
  );
}
