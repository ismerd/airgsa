import { ChartSection } from "@/components/dashboard/chart-section";
import { Topbar } from "@/components/dashboard/topbar";
import { CurrencyProvider } from "@/lib/currency-context";
import { kpiSeries } from "@/lib/services/platform";

export default function GsaPerformancePage() {
  const gsaData = kpiSeries.map((point) => ({ ...point, revenue: Math.round(point.revenue * 0.42) }));
  return (
    <CurrencyProvider>
      <Topbar title="Own performance" subtitle="GSA commercial scorecard" />
      <main className="p-5">
        <ChartSection allData={gsaData} />
      </main>
    </CurrencyProvider>
  );
}
