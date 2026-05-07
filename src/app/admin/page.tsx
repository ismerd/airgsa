import { Database, Newspaper, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";

const stats = [
  { label: "Users", value: "18", icon: Users },
  { label: "Companies", value: "11", icon: ShieldCheck },
  { label: "Imported posts", value: "124", icon: Newspaper },
  { label: "Tables ready", value: "11", icon: Database },
];

const recentActivity = [
  { text: "NordicLift Aviation Services registered — awaiting approval", time: "2 min ago", dot: "bg-amber-400" },
  { text: "BlueWing Cargo Solutions account activated", time: "1 hr ago", dot: "bg-emerald-400" },
  { text: "LinkedIn import completed — 12 new posts", time: "3 hr ago", dot: "bg-brand" },
  { text: "Adriatica Airlines registration received", time: "May 6, 2026", dot: "bg-amber-400" },
  { text: "PolarLine Cargo account suspended", time: "May 5, 2026", dot: "bg-rose-400" },
];

export default function AdminPage() {
  return (
    <>
      <Topbar title="Platform operations" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <p className="text-ink-muted">
            MVP console for role governance, source management, and Supabase schema readiness.
          </p>

          <div className="grid gap-5 md:grid-cols-4">
            {stats.map((item) => (
              <Card key={item.label} className="bg-white text-slate-950">
                <CardContent className="p-5">
                  <item.icon className="h-5 w-5 text-brand" />
                  <p className="mt-4 text-sm text-ink-muted">{item.label}</p>
                  <p className="mt-1 text-3xl font-semibold">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-ink">Recent activity</p>
              <ul className="mt-4 space-y-4">
                {recentActivity.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                    <div>
                      <p className="text-sm text-ink-muted">{item.text}</p>
                      <p className="text-xs text-ink-muted">{item.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
