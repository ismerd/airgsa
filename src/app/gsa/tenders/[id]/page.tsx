import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { getTenderById } from "@/lib/services/platform";

export default async function GsaTenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tender = await getTenderById(id);
  if (!tender) notFound();

  return (
    <>
      <Topbar title={tender.title} subtitle="Tender detail" />
      <main className="grid gap-5 p-5 xl:grid-cols-[1fr_.55fr]">
        <Card>
          <CardHeader>
            <CardTitle>{tender.airline}</CardTitle>
            <p className="text-sm text-slate-400">{tender.lanes}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <Info label="Annual tonnage" value={tender.annualTonnage.toLocaleString()} />
              <Info label="Expected start" value={tender.expectedStart} />
              <Info label="Deadline" value={tender.deadline} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Markets</p>
              <div className="flex flex-wrap gap-2">
                {tender.regions.map((region) => <Badge key={region}>{region}</Badge>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Requirements</p>
              <ul className="space-y-2 text-sm text-slate-300">
                {tender.requirements.map((item) => <li key={item} className="rounded-md bg-slate-950/60 p-3">{item}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fit summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-white text-slate-950 p-4">
              <p className="text-sm text-slate-500">Match score</p>
              <p className="mt-2 text-4xl font-semibold">91%</p>
            </div>
            <p className="text-sm leading-6 text-slate-300">
              Your DACH pharma coverage, GDP certification, and express account list align strongly with this RFP.
            </p>
            <Link href={`/gsa/tenders/${tender.id}/apply`} className={buttonVariants({ className: "w-full" })}>Apply to tender</Link>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
