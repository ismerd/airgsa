import Link from "next/link";
import type React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  Send,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canCreateApplication, canViewTender, isApplicationOwnedByGsa } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { listLiveApplications, listLiveTenders, type LiveTender, type LiveTenderApplication } from "@/lib/services/tender-workflow-store";

export const dynamic = "force-dynamic";

type ApplicationWithTender = {
  application: LiveTenderApplication;
  tender: LiveTender | null;
};

export default async function GsaTenderDeskPage() {
  const session = await getSession();

  if (!session) {
    return (
      <>
        <Topbar title="Tender Desk" subtitle="Authentication required" />
        <main className="p-5">
          <Card>
            <CardContent className="p-8 text-sm text-ink-muted">Please log in to review airline tenders.</CardContent>
          </Card>
        </main>
      </>
    );
  }

  const [tenders, applications] = await Promise.all([
    listLiveTenders(),
    listLiveApplications(),
  ]);
  const tenderById = new Map(tenders.map((tender) => [tender.id, tender]));
  const ownApplications = applications
    .filter((application) => isApplicationOwnedByGsa(session, application))
    .sort((left, right) => safeTime(right.submittedAt) - safeTime(left.submittedAt));
  const appliedTenderIds = new Set(ownApplications.map((application) => application.tenderId));
  const visibleTenders = tenders
    .filter((tender) => canViewTender(session, tender))
    .sort((left, right) => safeTime(left.deadline) - safeTime(right.deadline));
  const availableTenders = visibleTenders.filter((tender) => !appliedTenderIds.has(tender.id));
  const applicationRows: ApplicationWithTender[] = ownApplications.map((application) => ({
    application,
    tender: tenderById.get(application.tenderId) ?? null,
  }));
  const acceptedCount = ownApplications.filter((application) => application.status === "accepted").length;

  return (
    <>
      <Topbar title="Tender Desk" subtitle="Airline opportunities and applications" />
      <main className="space-y-5 p-5 animate-fade-in">
        <section className="grid gap-4 md:grid-cols-3">
          <TenderStat
            icon={<FileSearch className="h-5 w-5" />}
            label="Open to review"
            value={String(availableTenders.length)}
            helper="Airline tenders without an application"
          />
          <TenderStat
            icon={<Send className="h-5 w-5" />}
            label="Applications sent"
            value={String(ownApplications.length)}
            helper="Your submitted GSA proposals"
          />
          <TenderStat
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Awards won"
            value={String(acceptedCount)}
            helper="Accepted applications"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5 text-brand" />
                    New airline tenders
                  </CardTitle>
                  <p className="mt-1 max-w-2xl text-sm text-ink-muted">
                    This is the dedicated tender area. Tender work stays separate from the daily quote and shipment queue.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/gsa">Back to GSA work</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableTenders.length > 0 ? (
                availableTenders.map((tender) => (
                  <TenderOpportunity key={tender.id} tender={tender} canApply={canCreateApplication(session, tender)} />
                ))
              ) : (
                <EmptyState
                  title="No new tenders to review"
                  body="New airline mandates will appear here first. Submitted tenders stay visible in your application tracker."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-brand" />
                My applications
              </CardTitle>
              <p className="text-sm text-ink-muted">Track submitted proposals without mixing them into daily operations.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {applicationRows.length > 0 ? (
                applicationRows.map((row) => <ApplicationRow key={row.application.id} row={row} />)
              ) : (
                <EmptyState
                  title="No applications submitted"
                  body="Once you apply to a tender, the airline decision status will be tracked here."
                />
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}

function TenderStat({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardContent className="flex h-full items-center gap-3 p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-light text-brand">{icon}</div>
        <div className="min-w-0">
          <p className="text-[26px] font-bold leading-none tracking-tight text-ink tabular-nums">{value}</p>
          <p className="mt-1 text-sm font-medium text-ink-muted">{label}</p>
          <p className="mt-1 truncate text-xs text-ink-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TenderOpportunity({ tender, canApply }: { tender: LiveTender; canApply: boolean }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Open</Badge>
            <Badge variant="muted">{tender.countryScope || tender.regions.join(", ") || "Market scope"}</Badge>
            <Badge variant="muted">{formatDate(tender.deadline)}</Badge>
          </div>
          <h2 className="mt-3 text-base font-semibold text-ink">{tender.title}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {tender.airline} - {formatRoutes(tender)}
          </p>
          <div className="mt-3 grid gap-2 text-xs text-ink-muted sm:grid-cols-3">
            <TenderDetail label="Annual target" value={formatNumber(tender.annualTonnage)} />
            <TenderDetail label="Commercial model" value={formatCommercialModel(tender.commercialModel)} />
            <TenderDetail label="Start target" value={formatDate(tender.expectedStart)} />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <Button asChild size="sm" variant="outline">
            <Link href={`/gsa/tenders/${tender.id}`}>Review</Link>
          </Button>
          {canApply && (
            <Button asChild size="sm">
              <Link href={`/gsa/tenders/${tender.id}/apply`}>
                Apply
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicationRow({ row }: { row: ApplicationWithTender }) {
  const { application, tender } = row;

  return (
    <Link
      href={tender ? `/gsa/tenders/${tender.id}` : "/gsa/tenders"}
      className="block rounded-lg border border-border-ui bg-surface2 p-4 transition hover:border-brand/40 hover:bg-brand-light/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{tender?.title ?? "Tender no longer visible"}</p>
          <p className="mt-1 truncate text-sm text-ink-muted">
            {tender?.airline ?? application.email} - submitted {formatDate(application.submittedAt)}
          </p>
        </div>
        <Badge variant={applicationStatusVariant(application.status)}>{applicationStatusLabel(application.status)}</Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{application.proposedCommission}</p>
    </Link>
  );
}

function TenderDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface px-3 py-2">
      <p className="font-medium text-ink-muted">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-ink">{value}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-ui bg-surface2 p-5 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-ink-muted">{body}</p>
    </div>
  );
}

function applicationStatusVariant(status: LiveTenderApplication["status"]): "success" | "warning" | "default" | "danger" {
  if (status === "accepted") return "success";
  if (status === "rejected") return "danger";
  if (status === "shortlisted") return "default";
  return "warning";
}

function applicationStatusLabel(status: LiveTenderApplication["status"]) {
  if (status === "accepted") return "Awarded";
  if (status === "rejected") return "Not selected";
  if (status === "shortlisted") return "Shortlisted";
  return "Submitted";
}

function formatCommercialModel(value: LiveTender["commercialModel"]) {
  if (value === "capacity-risk") return "Capacity risk";
  if (value === "hybrid") return "Hybrid";
  if (value === "commission") return "Commission";
  return "Not set";
}

function formatRoutes(tender: LiveTender) {
  if (tender.routes.length > 0) {
    return `${tender.routes.length} lane${tender.routes.length === 1 ? "" : "s"}`;
  }

  return tender.lanes || "Lane scope TBC";
}

function formatDate(value: string) {
  const time = safeTime(value);
  if (!time) return "No date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(time));
}

function formatNumber(value: number) {
  return value.toLocaleString("en-GB");
}

function safeTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
