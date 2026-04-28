import { RevenueChart, YieldChart } from "@/components/dashboard/chart-card";
import { Topbar } from "@/components/dashboard/topbar";
import { kpiSeries } from "@/lib/services/platform";

export default function GsaPerformancePage() {
  return (
    <>
      <Topbar title="Own performance" subtitle="GSA commercial scorecard" />
      <main className="grid gap-5 p-5 xl:grid-cols-2">
        <RevenueChart data={kpiSeries.map((point) => ({ ...point, revenue: Math.round(point.revenue * 0.42) }))} />
        <YieldChart data={kpiSeries} />
      </main>
    </>
  );
}
