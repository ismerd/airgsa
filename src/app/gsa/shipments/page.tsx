import { Package, Plane, Search, XCircle } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { listMandateBookings } from "@/lib/services/mandate-execution-store";

export default async function ShipmentsPage() {
  const session = await getSession();
  const bookings = session ? await listMandateBookings(session) : [];
  const active = bookings.filter((booking) => booking.status === "booked");
  const flown = bookings.filter((booking) => booking.status === "flown");
  const cancelled = bookings.filter((booking) => booking.status === "cancelled");
  const revenue = bookings.reduce((sum, booking) => sum + booking.revenueAmount, 0);

  return (
    <>
      <Topbar title="Active Shipments" subtitle="Contract booking monitor" />
      <main className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active AWBs" value={String(active.length)} icon={<Package className="h-5 w-5" />} tone="brand" />
          <StatCard label="Flown" value={String(flown.length)} icon={<Plane className="h-5 w-5" />} tone="success" />
          <StatCard label="Cancelled" value={String(cancelled.length)} icon={<XCircle className="h-5 w-5" />} tone={cancelled.length ? "danger" : "success"} />
          <StatCard label="Revenue" value={formatMoney(revenue)} icon={<Search className="h-5 w-5" />} tone="brand" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border-ui">
                    {["AWB", "Customer", "Route", "Weight", "Flight", "Status", "Revenue", "Reconciliation"].map((header) => (
                      <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-muted">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-ui">
                  {bookings.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-muted">No contract bookings yet.</td></tr>
                  )}
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-ink">{booking.awbNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{booking.customer}</p>
                        <p className="text-xs text-ink-muted">{booking.contactEmail}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-ink">{booking.origin} - {booking.destination}</td>
                      <td className="px-4 py-3 text-ink-muted">
                        {booking.weightKg.toLocaleString()} kg
                        {booking.bookedWeightKg && booking.bookedWeightKg !== booking.weightKg && (
                          <p className="text-xs">Booked {booking.bookedWeightKg.toLocaleString()} kg</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        <span className="font-semibold text-ink">{booking.flightNumber ?? "-"}</span>
                        <p className="text-xs">{booking.flightDate}</p>
                      </td>
                      <td className="px-4 py-3"><BookingStatusBadge status={booking.status} /></td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{formatMoney(booking.revenueAmount)}</p>
                        {booking.bookedRevenueAmount && booking.bookedRevenueAmount !== booking.revenueAmount && (
                          <p className="text-xs text-ink-muted">Booked {formatMoney(booking.bookedRevenueAmount)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={booking.reconciliationStatus === "reconciled" ? "success" : booking.reconciliationStatus === "disputed" ? "danger" : "warning"}>
                          {booking.reconciliationStatus ?? "pending"}
                        </Badge>
                        {booking.reconciliationNote && <p className="mt-1 text-xs text-ink-muted">{booking.reconciliationNote}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function BookingStatusBadge({ status }: { status: "booked" | "flown" | "cancelled" }) {
  const variant = status === "flown" ? "success" : status === "cancelled" ? "danger" : "warning";
  return <Badge variant={variant}>{status}</Badge>;
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "brand" | "success" | "danger" }) {
  const color = tone === "brand" ? "bg-brand-light text-brand" : tone === "success" ? "bg-success-bg text-success" : "bg-danger-bg text-danger";
  return (
    <Card>
      <div className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function formatMoney(value: number) {
  return `EUR ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}
