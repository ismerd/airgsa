import Link from "next/link";
import { Sparkles, Star } from "lucide-react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applications, tenders } from "@/lib/services/platform";
import type { TenderApplication } from "@/lib/types";

const tenderTitleById = new Map(tenders.map((tender) => [tender.id, tender.title]));
const rankedApplications = [...applications].sort((left, right) => right.aiRating - left.aiRating);
const topApplication = rankedApplications[0];
const averageAiRating =
  applications.reduce((total, application) => total + application.aiRating, 0) / applications.length;

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
  { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  {
    header: "Actions",
    className: "min-w-[250px]",
    cell: () => (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary">Shortlist</Button>
        <Button size="sm">Accept</Button>
        <Button size="sm" variant="destructive">Reject</Button>
      </div>
    ),
  },
];

export default function ApplicationsPage() {
  return (
    <>
      <Topbar title="GSA applications" subtitle="AI-assisted comparison table" />
      <main className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <InsightMetric
            label="Applications"
            value={applications.length.toString()}
            helper="Across active tenders"
          />
          <InsightMetric
            label="Average AI rating"
            value={`${averageAiRating.toFixed(1)}/5.0`}
            helper="Mock scoring signal"
          />
          <InsightMetric
            label="Top ranked GSA"
            value={topApplication.gsaName}
            helper={`${topApplication.aiRating.toFixed(1)}/5.0 AI fit`}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Application ranking</CardTitle>
            <p className="text-sm text-ink-muted">
              Compare commercial, network, compliance, and mock AI fit before shortlisting or award.
            </p>
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
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
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
