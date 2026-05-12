import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { getGsaProfileById } from "@/lib/services/platform";
import { GsaDecisionPanel } from "./decision-panel";

export default async function GsaProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gsa = await getGsaProfileById(id);

  if (!gsa) notFound();

  return (
    <>
      <Topbar title={gsa.name} subtitle="GSA profile detail" />
      <main className="grid gap-5 p-5 xl:grid-cols-[1fr_.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Partner profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-lg leading-8 text-ink">{gsa.summary}</p>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Network score" value={gsa.networkScore} />
              <Metric label="Financial score" value={gsa.financialScore} />
              <Metric label="Compliance score" value={gsa.complianceScore} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Coverage</p>
              <div className="flex flex-wrap gap-2">
                {gsa.coverage.map((item) => <Badge key={item}>{item}</Badge>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {gsa.certifications.map((item) => <Badge key={item} variant="success">{item}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decision panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <GsaDecisionPanel gsaId={gsa.id} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white text-slate-950 p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
