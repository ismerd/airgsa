import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DocumentList } from "@/components/dashboard/document-list";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLiveApplication, listLiveTenders } from "@/lib/services/tender-workflow-store";

export default async function AirlineApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [application, tenders] = await Promise.all([getLiveApplication(id), listLiveTenders()]);
  if (!application) notFound();
  const tender = tenders.find((item) => item.id === application.tenderId);

  return (
    <>
      <Topbar title={application.gsaName} subtitle="Application detail" />
      <main className="space-y-4 p-5">
        <Button asChild variant="outline" size="sm">
          <Link href="/airline/applications">
            <ArrowLeft className="h-4 w-4" />
            Back to all applications
          </Link>
        </Button>

        <div className="grid gap-5 xl:grid-cols-[.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>GSA profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-ink">{application.gsaName}</p>
              <p className="mt-1 text-sm text-ink-muted">{application.contactName} - {application.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {application.markets.map((market) => <Badge key={market} variant="muted">{market}</Badge>)}
              {application.certifications.map((cert) => <Badge key={cert} variant="success">{cert}</Badge>)}
            </div>
            <Metric label="Network" value={`${application.networkScore}/100`} />
            <Metric label="Financial" value={`${application.financialScore}/100`} />
            <Metric label="Compliance" value={`${application.complianceScore}/100`} />
            <Metric label="Win rate" value={`${application.winRate}%`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposal</CardTitle>
            <p className="text-sm text-ink-muted">{tender?.title ?? application.tenderId}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Metric label="Commission" value={application.proposedCommission || "-"} />
              <Metric label="Launch timeline" value={application.launchTimeline || "-"} />
              <Metric label="Account coverage" value={application.namedAccountCoverage || "-"} />
              <Metric label="Monthly target" value={application.monthlySalesTarget || "-"} />
            </div>
            <TextBlock label="Network plan" value={application.networkPlan} />
            <TextBlock label="Operational readiness" value={application.operationalReadiness} />
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Documents</p>
              <DocumentList documents={application.documents} />
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
      <p className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm leading-6 text-ink-muted">{value || "-"}</p>
    </div>
  );
}
