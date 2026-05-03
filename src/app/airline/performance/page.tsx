import { AirlinePerformancePeriodPanel } from "@/components/dashboard/airline-performance-period-panel";
import { ChartSection } from "@/components/dashboard/chart-section";
import { TimeRangeFilter } from "@/components/dashboard/time-range-filter";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyProvider } from "@/lib/currency-context";
import { PeriodProvider } from "@/lib/period-context";
import { kpiSeries } from "@/lib/services/platform";

export default function AirlinePerformancePage() {
  return (
    <CurrencyProvider>
      <PeriodProvider>
        <Topbar
          title="Performance dashboard"
          subtitle="Commercial KPI monitoring"
          belowBar={<TimeRangeFilter />}
        />
        <main className="space-y-5 p-5">
          <ChartSection allData={kpiSeries} />

          <AirlinePerformancePeriodPanel />

          <Card>
            <CardHeader>
              <CardTitle>Route-level watchlist</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {["FRA-DXB loadfactor below target", "MUC-SIN pharma yield ahead of plan", "VIE-DOH bookings need GSA push"].map((item) => (
                <div key={item} className="rounded-md border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </PeriodProvider>
    </CurrencyProvider>
  );
}
