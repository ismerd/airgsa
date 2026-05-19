import { MailCheck } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listWorkflowEmailDeliveries } from "@/lib/services/notification-email";

export const dynamic = "force-dynamic";

export default async function AdminEmailDeliveriesPage() {
  const deliveries = await listWorkflowEmailDeliveries();
  const totals = deliveries.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { sent: 0, queued: 0, skipped: 0, failed: 0 },
  );

  return (
    <main className="min-h-screen bg-page">
      <Topbar title="Email delivery" subtitle="Workflow notification dispatch status" />
      <section className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Sent" value={totals.sent} tone="success" />
          <Metric label="Queued" value={totals.queued} tone="default" />
          <Metric label="Skipped" value={totals.skipped} tone="warning" />
          <Metric label="Failed" value={totals.failed} tone="danger" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-brand" />
              Recent delivery attempts
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b border-border-ui bg-surface2 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  {["Time", "Recipient", "Subject", "Provider", "Status", "Error"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ui">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td className="px-4 py-3 text-xs text-ink-muted">{formatDateTime(delivery.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{delivery.recipientEmail ?? "No recipient email"}</p>
                      <p className="text-xs text-ink-muted">{delivery.recipientRole}{delivery.recipientCompanyId ? ` - ${delivery.recipientCompanyId}` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-ink">{delivery.subject}</td>
                    <td className="px-4 py-3 text-ink-muted">{delivery.provider}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(delivery.status)}>{delivery.status}</Badge></td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-xs text-ink-muted">{delivery.error ?? "-"}</td>
                  </tr>
                ))}
                {deliveries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">No email delivery attempts recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "danger" | "default" }) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    default: "text-brand",
  }[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</p>
        <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function statusVariant(status: "sent" | "queued" | "skipped" | "failed") {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  if (status === "skipped") return "warning";
  return "default";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
