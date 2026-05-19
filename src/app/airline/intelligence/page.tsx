import Link from "next/link";
import type React from "react";
import { AlertTriangle, Newspaper, Radar, Route, ShieldCheck, Tags } from "lucide-react";
import { NewsCard } from "@/components/dashboard/news-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getContextualIntelligence } from "@/lib/services/contextual-intelligence";

export const dynamic = "force-dynamic";

export default async function AirlineIntelligencePage() {
  const session = await getSession();
  const snapshot = session ? await getContextualIntelligence(session) : null;
  const signals = snapshot?.signals ?? [];
  const topSignals = signals.slice(0, 8);

  return (
    <>
      <Topbar title="News / Cargo Intelligence" subtitle="Contract-aware market signals" />
      <main className="space-y-6 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm leading-6 text-ink-muted">
            Curated cargo news matched against accepted GSA contracts, awarded markets and assigned routes.
          </p>
          <Link href="/news" className={buttonVariants({ variant: "outline" })}>Open full news module</Link>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Active contracts" value={String(snapshot?.contracts.length ?? 0)} />
          <Metric icon={<Radar className="h-5 w-5" />} label="Matched signals" value={String(signals.length)} />
          <Metric icon={<Tags className="h-5 w-5" />} label="Tracked terms" value={String((snapshot?.marketTerms.length ?? 0) + (snapshot?.routeTerms.length ?? 0))} />
          <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Needs review" value={String(snapshot?.unclassifiedCount ?? 0)} tone={(snapshot?.unclassifiedCount ?? 0) > 0 ? "warning" : "success"} />
        </section>

        {snapshot && snapshot.marketTerms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-brand" />
                Contract context
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {snapshot.marketTerms.slice(0, 20).map((term) => <Badge key={term} variant="muted">{term}</Badge>)}
              {snapshot.routeTerms.slice(0, 20).map((term) => <Badge key={term} variant="default">{term}</Badge>)}
            </CardContent>
          </Card>
        )}

        {topSignals.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Prioritized signals</h2>
              <p className="mt-1 text-sm text-ink-muted">Ranked by contract matches, route/market terms and review confidence.</p>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {topSignals.map((signal) => (
                <div key={signal.post.id} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-ui bg-surface px-3 py-2">
                    <Badge variant={signal.relevanceScore >= 60 ? "success" : signal.relevanceScore >= 35 ? "warning" : "muted"}>
                      {signal.relevanceScore} relevance
                    </Badge>
                    {signal.matchedContracts.slice(0, 2).map((contract) => (
                      <Badge key={contract.id} variant="muted">{contract.gsaName} - {contract.market}</Badge>
                    ))}
                    {signal.matchedTerms.slice(0, 4).map((term) => <Badge key={term} variant="default">{term}</Badge>)}
                  </div>
                  <NewsCard post={signal.post} />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <Newspaper className="h-10 w-10 text-ink-muted/40" />
              <div>
                <p className="font-semibold text-ink">No contract-matched intelligence yet</p>
                <p className="mt-1 max-w-xl text-sm text-ink-muted">
                  Add active LinkedIn sources, import posts and review categories. Signals will appear here once they match active contract markets or routes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {signals.length > topSignals.length && (
          <div className="grid gap-5 xl:grid-cols-2">
            {signals.slice(8, 14).map((signal) => <NewsCard key={signal.post.id} post={signal.post} />)}
          </div>
        )}
      </main>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "brand",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "brand" | "success" | "warning";
}) {
  const color = tone === "success" ? "bg-success-bg text-success" : tone === "warning" ? "bg-warning-bg text-warning" : "bg-brand-light text-brand";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-semibold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
