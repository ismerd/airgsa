import { AirlinePerformancePeriodPanel } from "@/components/dashboard/airline-performance-period-panel";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { CurrencyProvider } from "@/lib/currency-context";
import { getAirlineOperationalPerformanceDashboard } from "@/lib/services/airline-performance-store";

export default async function AirlinePerformancePage() {
  const session = await getSession();
  const dashboard = session
    ? await getAirlineOperationalPerformanceDashboard(session)
    : {
        kpiData: [],
        countries: [],
        gsas: [],
        selectedAverage: {
          period: "monthly" as const,
          label: "All recorded operations",
          revenue: 0,
          yieldPerKg: 0,
          loadFactor: 0,
          tonnage: 0,
          flightCount: 0,
        },
        watchlist: [],
      };

  return (
    <CurrencyProvider>
      <Topbar
        title="Performance dashboard"
        subtitle="Commercial KPI monitoring from active contracts, quotes, bookings, and reports"
      />
      <main className="space-y-5 p-5">
        <AirlinePerformancePeriodPanel
          kpiData={dashboard.kpiData}
          countries={dashboard.countries}
          gsas={dashboard.gsas}
          selectedAverage={dashboard.selectedAverage}
        />

        <Card>
          <CardHeader>
            <CardTitle>Route-level watchlist</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {dashboard.watchlist.length > 0 ? (
              dashboard.watchlist.map((item) => (
                <div key={item} className="rounded-xl border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">
                  {item}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">
                No active route risks from the current operational workflow.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </CurrencyProvider>
  );
}
