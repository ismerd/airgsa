import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { getSession } from "@/lib/auth/session";
import { canViewApplication } from "@/lib/auth/permissions";
import { getGsaProfileById } from "@/lib/services/platform";
import { listLiveApplications, listLiveTenders } from "@/lib/services/tender-workflow-store";

export default async function GsaProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, gsa, applications, tenders] = await Promise.all([
    getSession(),
    getGsaProfileById(id),
    listLiveApplications(),
    listLiveTenders(),
  ]);

  if (!session || !gsa) notFound();
  const tenderById = new Map(tenders.map((tender) => [tender.id, tender]));

  const acceptedApplications = applications.filter((application) =>
    application.gsaId === id &&
    application.status === "accepted" &&
    canViewApplication(session, application, tenderById.get(application.tenderId) ?? null),
  );
  const latestAcceptedApplication = acceptedApplications.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (!latestAcceptedApplication) notFound();

  const tender = tenders.find((item) => item.id === latestAcceptedApplication.tenderId);

  return (
    <>
      <Topbar title={gsa.name} subtitle="Accepted GSA profile" />
      <main className="space-y-5 p-5">
        <Button asChild variant="outline">
          <Link href="/airline/gsa/overview">
            <ArrowLeft className="h-4 w-4" />
            Back to partner profiles
          </Link>
        </Button>

        <div className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
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
            <CardTitle>Accepted application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border-ui bg-success-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-success">Accepted</p>
              <p className="mt-2 font-semibold text-ink">{tender?.title ?? latestAcceptedApplication.tenderId}</p>
              <p className="mt-1 text-sm text-ink-muted">
                Accepted on {new Date(latestAcceptedApplication.updatedAt).toLocaleDateString("en-GB")}
              </p>
            </div>

            <ApplicationField label="Contact" value={`${latestAcceptedApplication.contactName} - ${latestAcceptedApplication.email}`} />
            <ApplicationField label="Commission" value={latestAcceptedApplication.proposedCommission} />
            <ApplicationField label="Launch timeline" value={latestAcceptedApplication.launchTimeline} />
            <ApplicationField label="Monthly target" value={latestAcceptedApplication.monthlySalesTarget} />
            <ApplicationField label="Network plan" value={latestAcceptedApplication.networkPlan} />

            <Button asChild className="w-full">
              <Link href="/airline/gsa/overview">
                <Route className="h-4 w-4" />
                Assign routes
              </Link>
            </Button>
          </CardContent>
        </Card>
        </div>
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

function ApplicationField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink">{value}</p>
    </div>
  );
}
