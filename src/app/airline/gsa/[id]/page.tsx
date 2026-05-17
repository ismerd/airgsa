import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import { getSession } from "@/lib/auth/session";
import { canViewApplication, canViewContract } from "@/lib/auth/permissions";
import { getGsaProfileById } from "@/lib/services/platform";
import { listLiveApplications, listLivePartnerContracts, listLiveTenders } from "@/lib/services/tender-workflow-store";

export default async function GsaProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, gsa, applications, tenders, contracts] = await Promise.all([
    getSession(),
    getGsaProfileById(id),
    listLiveApplications(),
    listLiveTenders(),
    listLivePartnerContracts(),
  ]);

  if (!session) notFound();
  const tenderById = new Map(tenders.map((tender) => [tender.id, tender]));
  const acceptedContracts = contracts.filter(
    (contract) => contract.gsaId === id && canViewContract(session, contract),
  );

  const acceptedApplications = applications.filter((application) =>
    application.gsaId === id &&
    application.status === "accepted" &&
    canViewApplication(session, application, tenderById.get(application.tenderId) ?? null),
  );
  const latestAcceptedApplication = acceptedApplications.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  const latestContract = acceptedContracts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (!latestAcceptedApplication && !latestContract) notFound();

  const tender = tenders.find((item) => item.id === (latestAcceptedApplication?.tenderId ?? latestContract?.tenderId));
  const profile = gsa ?? {
    id,
    name: latestContract?.gsaName ?? latestAcceptedApplication?.gsaName ?? "GSA partner",
    headquarters: latestContract?.headquarters ?? latestAcceptedApplication?.headquarters ?? "Not provided",
    coverage: latestContract?.coverage ?? latestAcceptedApplication?.coverage ?? [],
    certifications: latestContract?.certifications ?? latestAcceptedApplication?.certifications ?? [],
    cargoFocus: latestContract?.cargoFocus ?? latestAcceptedApplication?.cargoFocus ?? "General cargo",
    networkScore: latestContract?.networkScore ?? latestAcceptedApplication?.networkScore ?? 50,
    financialScore: latestContract?.financialScore ?? latestAcceptedApplication?.financialScore ?? 50,
    complianceScore: latestContract?.complianceScore ?? latestAcceptedApplication?.complianceScore ?? 50,
    winRate: latestContract?.winRate ?? latestAcceptedApplication?.winRate ?? 0,
    summary: `${latestContract?.gsaName ?? latestAcceptedApplication?.gsaName ?? "This GSA"} was accepted for ${latestContract?.market ?? tender?.countryScope ?? "this awarded scope"}.`,
  };
  const application = latestAcceptedApplication;

  return (
    <>
      <Topbar title={profile.name} subtitle="Accepted GSA profile" />
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
            <p className="text-lg leading-8 text-ink">{profile.summary}</p>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Network score" value={profile.networkScore} />
              <Metric label="Financial score" value={profile.financialScore} />
              <Metric label="Compliance score" value={profile.complianceScore} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Coverage</p>
              <div className="flex flex-wrap gap-2">
                {profile.coverage.map((item) => <Badge key={item}>{item}</Badge>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {profile.certifications.map((item) => <Badge key={item} variant="success">{item}</Badge>)}
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
              <p className="mt-2 font-semibold text-ink">{tender?.title ?? application?.tenderId ?? latestContract?.tenderId}</p>
              <p className="mt-1 text-sm text-ink-muted">
                Accepted on {new Date((application ?? latestContract)!.updatedAt).toLocaleDateString("en-GB")}
              </p>
            </div>

            <ApplicationField
              label="Contact"
              value={`${application?.contactName ?? latestContract?.contactName ?? "GSA contact"} - ${application?.email ?? latestContract?.email ?? ""}`}
            />
            <ApplicationField label="Commission" value={application?.proposedCommission ?? latestContract?.commercialTerms ?? "Not set"} />
            <ApplicationField label="Launch timeline" value={application?.launchTimeline ?? "Not provided"} />
            <ApplicationField
              label="Monthly target"
              value={application?.monthlySalesTarget ?? (latestContract?.monthlyTonnageTargetKg ? `${Math.round(latestContract.monthlyTonnageTargetKg / 1000)}t` : "Not set")}
            />
            <ApplicationField label="Network plan" value={application?.networkPlan ?? latestContract?.market ?? "Not provided"} />

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
