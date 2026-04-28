import { TenderCard } from "@/components/dashboard/tender-card";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { newsPosts, tenders } from "@/lib/services/platform";

export default function GsaMarketplacePage() {
  return (
    <>
      <Topbar title="Open tender marketplace" subtitle="GSA opportunity desk" />
      <main className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Open tenders" value="12" />
          <Metric label="Matched markets" value="7" />
          <Metric label="New signals" value={String(newsPosts.length)} />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {tenders.map((tender) => (
            <TenderCard key={tender.id} tender={tender} href={`/gsa/tenders/${tender.id}`} cta="Open tender" />
          ))}
        </div>
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-white text-slate-950">
      <CardHeader>
        <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
