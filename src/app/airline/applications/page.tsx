"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, FileText, Inbox, Route, Sparkles } from "lucide-react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveTender, LiveTenderApplication } from "@/lib/services/tender-workflow-store";
import { useAirlineGsaWorkflow } from "@/lib/use-airline-gsa-workflow";
import type { Status, TenderApplication } from "@/lib/types";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<LiveTenderApplication[]>([]);
  const [tenders, setTenders] = useState<LiveTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApplicationId, setPendingApplicationId] = useState<string | null>(null);
  const workflowApplications = useMemo(() => applications.map(toWorkflowApplication), [applications]);
  const workflow = useAirlineGsaWorkflow(workflowApplications);

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => res.json())
      .then((data) => {
        setApplications(data.applications ?? []);
        setTenders(data.tenders ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const tenderTitleById = new Map(tenders.map((tender) => [tender.id, tender.title]));
  const rankedApplications = [...applications].sort((left, right) => scoreApplication(right) - scoreApplication(left));
  const acceptedCount = applications.filter((application) => application.status === "accepted").length;
  const averageScore = applications.length
    ? Math.round(applications.reduce((sum, application) => sum + scoreApplication(application), 0) / applications.length)
    : 0;

  async function updateStatus(application: LiveTenderApplication, status: Extract<Status, "pending" | "shortlisted" | "accepted" | "rejected">) {
    setPendingApplicationId(application.id);
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setApplications((current) => current.map((item) => (item.id === application.id ? data.application : item)));
      workflow.setApplicationStatus(toWorkflowApplication(application), status);
    } finally {
      setPendingApplicationId(null);
    }
  }

  const columns: Column<LiveTenderApplication>[] = [
    {
      header: "GSA profile",
      className: "min-w-[230px]",
      cell: (row) => (
        <div>
          <Link href={`/airline/gsa/${row.gsaId}`} className="font-semibold text-brand hover:text-brand">
            {row.gsaName}
          </Link>
          <p className="mt-1 text-xs text-ink-muted">{row.contactName} · {row.email}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {row.certifications.map((cert) => <Badge key={cert} variant="success">{cert}</Badge>)}
          </div>
        </div>
      ),
    },
    {
      header: "Tender",
      cell: (row) => <span className="block max-w-[220px] text-ink-muted">{tenderTitleById.get(row.tenderId) ?? row.tenderId}</span>,
    },
    {
      header: "Fit score",
      cell: (row) => <Badge variant={scoreApplication(row) >= 85 ? "success" : scoreApplication(row) >= 75 ? "default" : "warning"}>{scoreApplication(row)}/100</Badge>,
    },
    { header: "Commercial", cell: (row) => row.proposedCommission || "-" },
    { header: "Launch", cell: (row) => row.launchTimeline || "-" },
    {
      header: "Plan",
      className: "min-w-[280px]",
      cell: (row) => (
        <div className="space-y-1 text-xs text-ink-muted">
          <p><span className="font-semibold text-ink">Accounts:</span> {row.namedAccountCoverage || "-"}</p>
          <p><span className="font-semibold text-ink">Target:</span> {row.monthlySalesTarget || "-"}</p>
          <p className="line-clamp-2"><span className="font-semibold text-ink">Network:</span> {row.networkPlan || "-"}</p>
        </div>
      ),
    },
    {
      header: "Docs",
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
          <FileText className="h-4 w-4 text-brand" />
          {row.documents.length}
        </span>
      ),
    },
    { header: "Submitted", cell: (row) => new Date(row.submittedAt).toLocaleString() },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    {
      header: "Actions",
      className: "min-w-[280px]",
      cell: (row) => {
        const isAccepted = row.status === "accepted";
        const isPending = pendingApplicationId === row.id;
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={isAccepted || isPending}
              onClick={() => updateStatus(row, row.status === "shortlisted" ? "pending" : "shortlisted")}
            >
              {isPending ? "Updating..." : row.status === "shortlisted" ? "Remove shortlist" : "Shortlist"}
            </Button>
            <Button size="sm" disabled={isAccepted || isPending} onClick={() => updateStatus(row, "accepted")}>
              {isPending ? "Updating..." : isAccepted ? <><CheckCircle2 className="h-3.5 w-3.5" /> Accepted</> : "Accept"}
            </Button>
            <Button size="sm" variant="destructive" disabled={isPending} onClick={() => updateStatus(row, "rejected")}>
              {isPending ? "Updating..." : "Reject"}
            </Button>
            {isAccepted && (
              <Button asChild size="sm" variant="outline">
                <Link href="/airline/gsa/overview">
                  <Route className="h-3.5 w-3.5" />
                  Assign routes
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href={`/airline/applications/${row.id}`}>
                <Eye className="h-3.5 w-3.5" />
                View
              </Link>
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Topbar title="GSA applications" subtitle="Live tender submissions" />
      <main className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <InsightMetric label="Applications" value={String(applications.length)} helper="Submitted by GSAs" />
          <InsightMetric label="Accepted GSAs" value={String(acceptedCount)} helper="Available for route assignment" />
          <InsightMetric label="Average fit score" value={applications.length ? `${averageScore}/100` : "-"} helper="Profile-based signal" />
          <InsightMetric label="Open tenders" value={String(tenders.filter((tender) => tender.status === "open").length)} helper="Receiving applications" />
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Application inbox</CardTitle>
              <p className="text-sm text-ink-muted">
                Only real submissions from GSA accounts are shown here. Static demo applications have been removed.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/airline/tenders/create">Create tender</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="p-6 text-sm text-ink-muted">Loading applications...</p>
            ) : rankedApplications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border-ui bg-surface2 p-10 text-center">
                <Inbox className="h-10 w-10 text-ink-muted/40" />
                <div>
                  <p className="font-semibold text-ink">No applications yet</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Publish a tender, log in as a GSA account, and submit an application. It will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <DataTable columns={columns} data={rankedApplications} />
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function toWorkflowApplication(application: LiveTenderApplication): TenderApplication {
  return {
    id: application.id,
    tenderId: application.tenderId,
    gsaId: application.gsaId,
    gsaName: application.gsaName,
    aiRating: scoreApplication(application) / 20,
    commercialScore: application.financialScore,
    networkScore: application.networkScore,
    complianceScore: application.complianceScore,
    proposedCommission: application.proposedCommission,
    status: application.status,
    submittedAt: new Date(application.submittedAt).toLocaleDateString("en-GB"),
  };
}

function scoreApplication(application: LiveTenderApplication) {
  return Math.round((application.networkScore + application.financialScore + application.complianceScore) / 3);
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
