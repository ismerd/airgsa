import Link from "next/link";
import { ArrowRight, Database, Newspaper, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { getPendingRegistrations } from "@/lib/registrations";

export const revalidate = 30;

export default async function AdminPage() {
  const pending = getPendingRegistrations();
  const pendingCount = pending.length;

  const stats = [
    { label: "Active accounts", value: "21", icon: Users },
    { label: "Pending approvals", value: String(pendingCount), icon: ShieldCheck, alert: pendingCount > 0 },
    { label: "Imported posts", value: "124", icon: Newspaper },
    { label: "API integrations", value: "2", icon: Database },
  ];

  const recentActivity = [
    ...pending.slice(0, 3).map((r) => ({
      text: `${r.name} (${r.company}) — access request pending`,
      time: new Date(r.submittedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      dot: "bg-amber-400",
    })),
    { text: `${realGsaPartners[0].name} account activated`, time: "1 hr ago", dot: "bg-emerald-400" },
    { text: "LinkedIn import completed — 12 new posts", time: "3 hr ago", dot: "bg-brand" },
    { text: "Saudia Cargo registered as demo airline", time: "May 6, 2026", dot: "bg-emerald-400" },
  ].slice(0, 6);

  return (
    <>
      <Topbar title="Platform operations" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* KPI tiles */}
          <div className="grid gap-5 md:grid-cols-4">
            {stats.map((item) => (
              <Card key={item.label} className={item.alert ? "border-amber-500/40 bg-amber-500/5" : ""}>
                <CardContent className="p-5">
                  <item.icon className={`h-5 w-5 ${item.alert ? "text-amber-400" : "text-brand"}`} />
                  <p className="mt-4 text-sm text-ink-muted">{item.label}</p>
                  <p className={`mt-1 text-3xl font-bold ${item.alert ? "text-amber-400" : "text-ink"}`}>
                    {item.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pending CTA */}
          {pendingCount > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="font-semibold text-amber-300">
                    {pendingCount} access request{pendingCount > 1 ? "s" : ""} awaiting review
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {pending.map((r) => r.company).join(", ")}
                  </p>
                </div>
                <Link
                  href="/admin/accounts"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors"
                >
                  Review <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Recent activity */}
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-ink">Recent activity</p>
              <ul className="mt-4 space-y-4">
                {recentActivity.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                    <div>
                      <p className="text-sm text-ink-muted">{item.text}</p>
                      <p className="text-xs text-ink-muted/60">{item.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Quick links */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Manage accounts", href: "/admin/accounts", desc: "Review registrations, approve or reject access requests" },
              { label: "LinkedIn sources", href: "/admin/sources", desc: "Configure LinkedIn pages for cargo intelligence import" },
              { label: "Test FR24 API", href: "/admin/fr24", desc: "Verify Flightradar24 API connectivity and inspect live data" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-xl border border-border-ui bg-surface p-4 transition-colors hover:border-brand/40 hover:bg-surface2"
              >
                <p className="text-sm font-semibold text-ink group-hover:text-brand transition-colors">{link.label}</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">{link.desc}</p>
              </Link>
            ))}
          </div>

        </div>
      </main>
    </>
  );
}
