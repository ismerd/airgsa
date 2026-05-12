"use client";

import Link from "next/link";
import { CheckCircle2, Route, Sparkles, Star } from "lucide-react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applications, tenders } from "@/lib/services/platform";
import { useAirlineGsaWorkflow } from "@/lib/use-airline-gsa-workflow";
import type { TenderApplication } from "@/lib/types";

const tenderTitleById = new Map(tenders.map((tender) => [tender.id, tender.title]));
const rankedApplications = [...applications].sort((left, right) => right.aiRating - left.aiRating);
const topApplication = rankedApplications[0];
const averageAiRating =
  applications.reduce((total, application) => total + application.aiRating, 0) / applications.length;

export default function ApplicationsPage() {
  const workflow = useAirlineGsaWorkflow(applications);
  const acceptedCount = Object.keys(workflow.state.acceptedGsas).length;

  const columns: Column<TenderApplication>[] = [
    {
      header: "Rank",
      className: "whitespace-nowrap",
      cell: (row) => {
        const rank = rankedApplications.findIndex((application) => application.id === row.id) + 1;
        return (
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface2 text-sm font-semibold text-ink">
            {rank}
          </div>
        );
      },
    },
    {
      header: "GSA",
      cell: (row) => (
        <Link href={`/airline/gsa/${row.gsaId}`} className="font-semibold text-brand hover:text-brand">
          {row.gsaName}
        </Link>
      ),
    },
    {
      header: "Tender",
      cell: (row) => (
        <span className="block max-w-[220px] text-ink-muted">
          {tenderTitleById.get(row.tenderId) ?? row.tenderId}
        </span>
      ),
    },
    {
      header: "AI Bewertung",
      className: "min-w-[150px]",
      cell: (row) => <AiRating rating={row.aiRating} />,
    },
    { header: "Commercial", cell: (row) => row.commercialScore },
    { header: "Network", cell: (row) => row.networkScore },
    { header: "Compliance", cell: (row) => row.complianceScore },
    { header: "Commission", cell: (row) => row.proposedCommission },
    { header: "Submitted", cell: (row) => row.submittedAt },
    {
      header: "Status",
      cell: (row) => <StatusBadge status={workflow.applicationStatus(row)} />,
    },
    {
      header: "Actions",
      className: "min-w-[300px]",
      cell: (row) => {
        const status = workflow.applicationStatus(row);
        const isAccepted = status === "accepted";

        return (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={isAccepted}
              onClick={() => workflow.setApplicationStatus(row, "shortlisted")}
            >
              Shortlist
            </Button>
            <Button
              size="sm"
              disabled={isAccepted}
              onClick={() => workflow.setApplicationStatus(row, "accepted")}
            >
              {isAccepted ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Accepted
                </>
              ) : (
                "Accept"
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => workflow.setApplicationStatus(row, "rejected")}
            >
              Reject
            </Button>
            {isAccepted && (
              <Button asChild size="sm" variant="outline">
                <Link href="/airline/gsa/overview">
                  <Route className="h-3.5 w-3.5" />
                  Assign routes
                </Link>
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Topbar title="GSA applications" subtitle="AI-assisted comparison table" />
      <main className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <InsightMetric
            label="Applications"
            value={applications.length.toString()}
            helper="Across active tenders"
          />
          <InsightMetric
            label="Accepted GSAs"
            value={String(acceptedCount)}
            helper="Available for route assignment"
          />
          <InsightMetric
            label="Average AI rating"
            value={`${averageAiRating.toFixed(1)}/5.0`}
            helper="Scoring signal"
          />
          <InsightMetric
            label="Top ranked GSA"
            value={topApplication.gsaName}
            helper={`${topApplication.aiRating.toFixed(1)}/5.0 AI fit`}
          />
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Application ranking</CardTitle>
              <p className="text-sm text-ink-muted">
                Accept a GSA to add it to your active partner workspace and assign routes.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/airline/gsa/overview">
                <Route className="h-4 w-4" />
                Open partner routes
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={rankedApplications} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function InsightMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Sparkles className="h-4 w-4 text-brand" />
        {label}
      </p>
      <p className="mt-2 truncate text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{helper}</p>
    </div>
  );
}

function AiRating({ rating }: { rating: number }) {
  const variant = rating >= 4.5 ? "success" : rating >= 4 ? "default" : rating >= 3.5 ? "warning" : "muted";
  const width = `${Math.max(0, Math.min(100, (rating / 5) * 100))}%`;

  return (
    <div className="space-y-2">
      <Badge variant={variant}>
        <Star className="mr-1 h-3.5 w-3.5 fill-current" />
        {rating.toFixed(1)}/5.0
      </Badge>
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full bg-brand" style={{ width }} />
      </div>
    </div>
  );
}
