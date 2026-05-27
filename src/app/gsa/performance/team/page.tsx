import { Award, PackageCheck, TrendingUp, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getGsaPerformanceData } from "@/lib/services/mandate-execution-store";
import { listTeamAccounts } from "@/lib/services/team-accounts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import {
  KpiCard,
  buildEmployeePerformance,
  canViewEmployeePerformance,
  formatDate,
  formatMoney,
  formatTonnage,
} from "../performance-shared";

export default async function GsaTeamPerformancePage() {
  const session = await getSession();
  if (!session || !canViewEmployeePerformance(session)) redirect("/gsa/performance");

  const [performanceData, teamAccounts] = await Promise.all([
    getGsaPerformanceData(session),
    listTeamAccounts(session.company, "gsa", session.companyId),
  ]);
  const employeePerformance = buildEmployeePerformance(session, teamAccounts, performanceData.quotes, performanceData.bookings);
  const teamTotals = employeePerformance.reduce(
    (sum, employee) => ({
      revenue: sum.revenue + employee.revenueAmount,
      tonnageKg: sum.tonnageKg + employee.tonnageKg,
      quoteCount: sum.quoteCount + employee.quoteCount,
      bookingCount: sum.bookingCount + employee.bookingCount,
    }),
    { revenue: 0, tonnageKg: 0, quoteCount: 0, bookingCount: 0 },
  );
  const teamWinRate = teamTotals.quoteCount > 0 ? Math.round((teamTotals.bookingCount / teamTotals.quoteCount) * 100) : 0;

  return (
    <>
      <Topbar title="Team Performance" subtitle="Employee sales, bookings, tonnage and conversion" />
      <main className="space-y-5 p-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Team revenue" value={formatMoney(teamTotals.revenue)} sub={`${teamTotals.bookingCount} booked shipments`} tone={teamTotals.revenue > 0 ? "success" : "warning"} />
          <KpiCard icon={<PackageCheck className="h-5 w-5" />} label="Team tonnage" value={formatTonnage(teamTotals.tonnageKg)} sub="Booked this month" tone={teamTotals.tonnageKg > 0 ? "success" : "warning"} />
          <KpiCard icon={<Award className="h-5 w-5" />} label="Team win rate" value={`${teamWinRate}%`} sub={`${teamTotals.bookingCount} bookings from ${teamTotals.quoteCount} quotes`} tone={teamWinRate >= 35 ? "success" : teamTotals.quoteCount > 0 ? "warning" : "danger"} />
          <KpiCard icon={<Users className="h-5 w-5" />} label="Active employees" value={String(employeePerformance.length)} sub="Included in comparison" tone={employeePerformance.length > 0 ? "success" : "warning"} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand" />
              Employee comparison
            </CardTitle>
            <p className="text-sm text-ink-muted">
              Quote output, bookings, tonnage, revenue, win rate and average selling rate by employee for the current month.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
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
          </CardContent>
        </Card>
      </main>
    </>
  );
}
