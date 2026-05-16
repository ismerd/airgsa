"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, FileText, MapPin, Package, Plus, UsersRound } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveTender, LiveTenderApplication } from "@/lib/services/tender-workflow-store";
import { getApplicationsForTender, getTenderCargoTypes, getTenderStage } from "@/lib/tender-workspace";

export default function AirlineTendersPage() {
  const [tenders, setTenders] = useState<LiveTender[]>([]);
  const [applications, setApplications] = useState<LiveTenderApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/tenders").then((res) => (res.ok ? res.json() : { tenders: [] })),
      fetch("/api/applications").then((res) => (res.ok ? res.json() : { applications: [] })),
    ])
      .then(([tenderData, applicationData]) => {
        if (!active) return;
        setTenders(tenderData.tenders ?? []);
        setApplications(applicationData.applications ?? []);
      })
      .catch(() => {
        if (!active) return;
        setTenders([]);
        setApplications([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const stages = tenders.map((tender) => getTenderStage(tender, applications));
    return {
      total: tenders.length,
      active: stages.filter((stage) => ["published", "applications-open", "evaluation", "shortlisted"].includes(stage.key)).length,
      evaluation: stages.filter((stage) => ["evaluation", "shortlisted"].includes(stage.key)).length,
      awarded: stages.filter((stage) => stage.key === "awarded").length,
    };
  }, [applications, tenders]);

  return (
    <>
      <Topbar title="Tender Workspace" subtitle="Airline sourcing and GSA award desk" />
      <main className="space-y-5 p-5">
        <section className="rounded-2xl border border-border-ui bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Tender command center</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">GSA tender pipeline</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                Create market mandates, collect structured GSA applications, evaluate candidates, and award the winning partner from one workspace.
              </p>
            </div>
            <Link href="/airline/tenders/create" className={buttonVariants({ size: "lg" })}>
              <Plus className="h-4 w-4" />
              Create Tender
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PipelineMetric label="Total tenders" value={metrics.total} helper="All tender workspaces" />
            <PipelineMetric label="Active" value={metrics.active} helper="Published to evaluation" tone="brand" />
            <PipelineMetric label="In evaluation" value={metrics.evaluation} helper="Applications under review" tone="warning" />
            <PipelineMetric label="Awarded" value={metrics.awarded} helper="Winner selected" tone="success" />
          </div>
        </section>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Tender portfolio</CardTitle>
                <p className="mt-1 text-sm text-ink-muted">
                  Card/table hybrid view with stage, deadline, applications, and direct workspace access.
                </p>
              </div>
              <Badge variant="muted">{loading ? "Loading" : `${tenders.length} tenders`}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-xl border border-border-ui bg-surface2 p-8 text-center text-sm text-ink-muted">
                Loading tender pipeline...
              </div>
            ) : tenders.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border-ui bg-surface2 p-12 text-center">
                <FileText className="h-10 w-10 text-ink-muted/50" />
                <div>
                  <p className="font-semibold text-ink">No tenders yet</p>
                  <p className="mt-1 max-w-md text-sm text-ink-muted">
                    Start with a market and cargo focus, then publish it to the GSA marketplace.
                  </p>
                </div>
                <Link href="/airline/tenders/create" className={buttonVariants()}>
                  Create Tender
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {tenders.map((tender) => (
                  <TenderPortfolioCard
                    key={tender.id}
                    tender={tender}
                    applications={getApplicationsForTender(tender.id, applications)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function TenderPortfolioCard({
  tender,
  applications,
}: {
  tender: LiveTender;
  applications: LiveTenderApplication[];
}) {
  const stage = getTenderStage(tender, applications);
  const cargoTypes = getTenderCargoTypes(tender);
  const shortlisted = applications.filter((application) => application.status === "shortlisted").length;
  const accepted = applications.filter((application) => application.status === "accepted").length;

  return (
    <article className="overflow-hidden rounded-2xl border border-border-ui bg-surface shadow-sm">
      <div className="border-b border-border-ui bg-surface2 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-brand">{tender.airline}</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-ink">{tender.title}</h2>
          </div>
          <Badge variant={stage.variant}>{stage.label}</Badge>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface3">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${stage.progress}%` }} />
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_190px]">
        <div className="space-y-3">
          <FactRow icon={MapPin} label="Region" value={tender.countryScope || tender.regions.join(", ") || "Not set"} />
          <FactRow icon={Package} label="Cargo focus" value={cargoTypes.join(", ") || tender.productMix || "Not set"} />
          <FactRow icon={CalendarDays} label="Deadline" value={tender.deadline || "Not set"} />
          <FactRow icon={UsersRound} label="Applications" value={`${applications.length} total, ${shortlisted} shortlisted, ${accepted} awarded`} />
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl border border-border-ui bg-surface2 p-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Current stage</p>
            <p className="mt-2 text-lg font-semibold text-ink">{stage.label}</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">{getStageHelper(stage.key)}</p>
          </div>
          <Button asChild className="w-full">
            <Link href={`/airline/tenders/${tender.id}`}>
              {stage.key === "draft" ? "Finish Draft" : "Open Workspace"}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function FactRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 text-sm">
      <span className="flex items-center gap-2 text-ink-muted">
        <Icon className="h-4 w-4 text-brand" />
        {label}
      </span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function PipelineMetric({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone?: "brand" | "warning" | "success";
}) {
  const toneClass = {
    brand: "border-brand/25 bg-brand-light text-brand",
    warning: "border-[#B45309]/25 bg-warning-bg text-warning",
    success: "border-[#0B7A52]/25 bg-success-bg text-success",
  }[tone ?? "brand"];

  return (
    <div className={`rounded-xl border p-4 ${tone ? toneClass : "border-border-ui bg-surface2 text-ink"}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-75">{helper}</p>
    </div>
  );
}

function getStageHelper(stage: string) {
  if (stage === "draft") return "Not visible to GSAs yet.";
  if (stage === "published") return "Published, waiting for scope completion.";
  if (stage === "applications-open") return "Applications can be submitted.";
  if (stage === "evaluation") return "Applications are ready for comparison.";
  if (stage === "shortlisted") return "Candidate shortlist is being reviewed.";
  if (stage === "awarded") return "Winner selected and tender awarded.";
  return "Tender process is closed.";
}
