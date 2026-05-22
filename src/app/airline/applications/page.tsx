"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  FileText,
  Inbox,
  Plus,
  Search,
  ShieldAlert,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  getAirlineApplicationSeenState,
  markAirlineApplicationsSeen,
  markTenderApplicationsSeen as persistTenderApplicationsSeen,
} from "@/lib/client-notification-state";
import type { LiveTender, LiveTenderApplication } from "@/lib/services/tender-workflow-store";
import {
  getApplicationsForTender,
  getTenderCargoTypes,
  getTenderStage,
  scoreCandidate,
  toStructuredApplication,
  type CandidateScorecard,
} from "@/lib/tender-workspace";
import type { Status } from "@/lib/types";

type ApplicationStatusFilter = "all" | "pending" | "shortlisted" | "accepted" | "rejected";
type ApplicationSort = "score-desc" | "submitted-desc" | "gsa-asc" | "status-asc";

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
  const tenderIdParam = searchParams.get("tender");
  const appliedTenderParamRef = useRef<string | null>(null);
  const [applications, setApplications] = useState<LiveTenderApplication[]>([]);
  const [tenders, setTenders] = useState<LiveTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatusFilter>("all");
  const [sortBy, setSortBy] = useState<ApplicationSort>("score-desc");
  const [query, setQuery] = useState("");
  const [tenderSeenAt, setTenderSeenAt] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    markAirlineApplicationsSeen().catch(() => undefined);

    Promise.all([
      fetch("/api/applications").then((res) => (res.ok ? res.json() : { applications: [], tenders: [] })),
      getAirlineApplicationSeenState(),
    ])
      .then(([data, seenState]) => {
        if (!active) return;
        setApplications(data.applications ?? []);
        setTenders(data.tenders ?? []);
        setTenderSeenAt(seenState.tenderSeenAt);
      })
      .catch(() => {
        if (!active) return;
        setApplications([]);
        setTenders([]);
        setTenderSeenAt({});
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const applicationsByTender = useMemo(() => {
    const map = new Map<string, LiveTenderApplication[]>();
    for (const application of applications) {
      const rows = map.get(application.tenderId) ?? [];
      rows.push(application);
      map.set(application.tenderId, rows);
    }
    return map;
  }, [applications]);

  const tenderOptions = useMemo(() => {
    return tenders
      .map((tender) => {
        const rows = applicationsByTender.get(tender.id) ?? [];
        const latestSubmittedAt = rows.reduce((latest, row) => Math.max(latest, new Date(row.submittedAt).getTime()), 0);
        const acceptedCount = rows.filter((row) => row.status === "accepted").length;
        const stage = getTenderStage(tender, rows);
        return {
          tender,
          stage,
          applicationCount: rows.length,
          pendingCount: rows.filter((row) => row.status === "pending").length,
          acceptedCount,
          awardSlots: getAwardSlots(tender),
          latestPendingSubmittedAt: rows
            .filter((row) => row.status === "pending")
            .reduce((latest, row) => Math.max(latest, new Date(row.submittedAt).getTime()), 0),
          latestSubmittedAt,
        };
      })
      .sort((left, right) => right.latestSubmittedAt - left.latestSubmittedAt || right.applicationCount - left.applicationCount);
  }, [applicationsByTender, tenders]);

  const selectedTender = useMemo(
    () => tenders.find((tender) => tender.id === selectedTenderId) ?? null,
    [selectedTenderId, tenders],
  );

  const selectedTenderApplications = useMemo(
    () => (selectedTender ? getApplicationsForTender(selectedTender.id, applications) : []),
    [applications, selectedTender],
  );

  const candidateRows = useMemo(() => {
    if (!selectedTender) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return selectedTenderApplications
      .map((application) => ({
        application,
        structured: toStructuredApplication(selectedTender, application),
        scorecard: scoreCandidate(selectedTender, application),
      }))
      .filter(({ application, structured }) => {
        if (statusFilter !== "all" && application.status !== statusFilter) return false;
        if (!normalizedQuery) return true;
        return [
          application.gsaName,
          application.contactName,
          application.email,
          structured.country,
          structured.coveredAirports.join(" "),
          structured.cargoCapabilities.join(" "),
          application.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (sortBy === "submitted-desc") {
          return new Date(right.application.submittedAt).getTime() - new Date(left.application.submittedAt).getTime();
        }
        if (sortBy === "gsa-asc") return left.application.gsaName.localeCompare(right.application.gsaName);
        if (sortBy === "status-asc") return statusRank(left.application.status) - statusRank(right.application.status);
        return right.scorecard.overallFit - left.scorecard.overallFit;
      });
  }, [query, selectedTender, selectedTenderApplications, sortBy, statusFilter]);

  const selectedApplication = selectedApplicationId
    ? selectedTenderApplications.find((application) => application.id === selectedApplicationId) ?? null
    : null;
  const selectedApplicationStructured = selectedApplication && selectedTender
    ? toStructuredApplication(selectedTender, selectedApplication)
    : null;
  const selectedApplicationScore = selectedApplication && selectedTender
    ? scoreCandidate(selectedTender, selectedApplication)
    : null;
  const selectedTenderOption = selectedTender
    ? tenderOptions.find((option) => option.tender.id === selectedTender.id) ?? null
    : null;
  const acceptedCount = selectedTenderApplications.filter((application) => application.status === "accepted").length;
  const awardSlots = selectedTender ? getAwardSlots(selectedTender) : 1;
  const awardFilled = acceptedCount >= awardSlots;

  useEffect(() => {
    if (loading) return;
    if (
      tenderIdParam &&
      appliedTenderParamRef.current !== tenderIdParam &&
      tenderOptions.some((option) => option.tender.id === tenderIdParam)
    ) {
      appliedTenderParamRef.current = tenderIdParam;
      setSelectedTenderId(tenderIdParam);
      const option = tenderOptions.find((item) => item.tender.id === tenderIdParam);
      if (option) markTenderApplicationsSeen(option.tender.id, option.latestPendingSubmittedAt);
      return;
    }
    if (selectedTenderId && tenderOptions.some((option) => option.tender.id === selectedTenderId)) return;
    setSelectedTenderId(tenderOptions[0]?.tender.id ?? null);
  }, [loading, selectedTenderId, tenderIdParam, tenderOptions]);

  async function updateStatus(application: LiveTenderApplication, status: Extract<Status, "pending" | "shortlisted" | "accepted" | "rejected">) {
    setPendingAction(`${application.id}:${status}`);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Application status could not be updated");
        return;
      }
      setApplications((current) =>
        current.map((item) => {
          if (item.id === application.id) return data.application;
          if (data.tender?.status === "closed" && item.tenderId === data.tender.id && item.status !== "accepted") {
            return { ...item, status: "rejected", updatedAt: new Date().toISOString() };
          }
          return item;
        }),
      );
      if (data.tender) {
        setTenders((current) => current.map((item) => (item.id === data.tender.id ? data.tender : item)));
      }
    } catch (err) {
      setError((err as Error).message || "Application status could not be updated");
    } finally {
      setPendingAction(null);
    }
  }

  function selectTender(option: (typeof tenderOptions)[number]) {
    setSelectedTenderId(option.tender.id);
    setSelectedApplicationId(null);
    setStatusFilter("all");
    setQuery("");
    markTenderApplicationsSeen(option.tender.id, option.latestPendingSubmittedAt);
  }

  function markTenderApplicationsSeen(tenderId: string, latestPendingSubmittedAt: number) {
    const seenAt = Math.max(Date.now(), latestPendingSubmittedAt);
    setTenderSeenAt((current) => {
      const next = { ...current, [tenderId]: seenAt };
      return next;
    });
    persistTenderApplicationsSeen(tenderId, latestPendingSubmittedAt)
      .then((state) => {
        if (state) setTenderSeenAt(state.tenderSeenAt);
      })
      .catch(() => undefined);
  }

  return (
    <>
      <Topbar title="Application Decision Room" subtitle="GSA tender submissions" />
      <main className="space-y-5 p-5">
        <section className="rounded-2xl border border-border-ui bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Application review</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Tender applicant workspace</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                Compare applicants, shortlist follow-ups, and award the partner for the selected tender.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/airline/tenders/create" className={buttonVariants({ variant: "outline" })}>
                <Plus className="h-4 w-4" />
                Create Tender
              </Link>
              {selectedTender && (
                <Link href={`/airline/tenders/${selectedTender.id}`} className={buttonVariants()}>
                  Open Tender Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </section>

        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Tender workspaces</CardTitle>
                <p className="mt-1 text-sm text-ink-muted">Choose which tender the decision board should evaluate.</p>
              </div>
              <Badge variant="muted">{loading ? "Loading" : `${tenderOptions.length} tenders`}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="rounded-xl border border-border-ui bg-surface2 p-6 text-sm text-ink-muted">Loading tenders...</p>
            ) : tenderOptions.length === 0 ? (
              <EmptyState title="No tenders available" text="Create a tender first. Applications will be grouped underneath it." />
            ) : (
              <div className="grid gap-3 xl:grid-cols-4">
                {tenderOptions.map((option) => {
                  const selected = option.tender.id === selectedTenderId;
                  const hasNewApplications = option.pendingCount > 0 && option.latestPendingSubmittedAt > (tenderSeenAt[option.tender.id] ?? 0);
                  return (
                    <TenderSelectorCard
                      key={option.tender.id}
                      option={option}
                      selected={selected}
                      hasNewApplications={hasNewApplications}
                      onClick={() => selectTender(option)}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedTender && (
          <section className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Decision board</p>
                    <CardTitle className="mt-1">{selectedTender.title}</CardTitle>
                    <p className="mt-1 text-sm text-ink-muted">
                      {selectedTender.countryScope || selectedTender.regions.join(", ")} - {getTenderCargoTypes(selectedTender).join(", ") || selectedTender.productMix || "cargo scope"}
                    </p>
                  </div>
                  {selectedTenderOption && <Badge variant={selectedTenderOption.stage.variant}>{selectedTenderOption.stage.label}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_210px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search GSA, country, airport, capability..."
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ApplicationStatusFilter)}>
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </Select>
                  <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as ApplicationSort)}>
                    <option value="score-desc">Sort: fit score</option>
                    <option value="submitted-desc">Sort: newest</option>
                    <option value="gsa-asc">Sort: GSA name</option>
                    <option value="status-asc">Sort: status</option>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["all", "pending", "shortlisted", "accepted", "rejected"] as ApplicationStatusFilter[]).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={statusFilter === status ? "default" : "outline"}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === "all" ? "All" : capitalize(status)}
                      <span className="ml-1 text-xs opacity-75">({countStatus(selectedTenderApplications, status)})</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {candidateRows.length === 0 ? (
              <EmptyState title="No matching applications" text="Adjust the filters or search term to review more submissions." />
            ) : (
              <div className="grid gap-4 2xl:grid-cols-2">
                {candidateRows.map(({ application, structured, scorecard }) => (
                  <CandidateReviewCard
                    key={application.id}
                    application={application}
                    structured={structured}
                    scorecard={scorecard}
                    awardFilled={awardFilled}
                    pendingAction={pendingAction}
                    onView={() => setSelectedApplicationId(application.id)}
                    onShortlist={() => updateStatus(application, application.status === "shortlisted" ? "pending" : "shortlisted")}
                    onAccept={() => updateStatus(application, "accepted")}
                    onReject={() => updateStatus(application, "rejected")}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {selectedApplication && selectedApplicationStructured && selectedApplicationScore && (
          <ApplicationDrawer
            application={selectedApplication}
            structured={selectedApplicationStructured}
            scorecard={selectedApplicationScore}
            onClose={() => setSelectedApplicationId(null)}
          />
        )}
      </main>
    </>
  );
}

function TenderSelectorCard({
  option,
  selected,
  hasNewApplications,
  onClick,
}: {
  option: {
    tender: LiveTender;
    stage: ReturnType<typeof getTenderStage>;
    applicationCount: number;
    pendingCount: number;
    acceptedCount: number;
    awardSlots: number;
    latestPendingSubmittedAt: number;
    latestSubmittedAt: number;
  };
  selected: boolean;
  hasNewApplications: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-brand bg-brand-light shadow-[inset_4px_0_0_var(--brand)]"
          : "border-border-ui bg-surface2 hover:border-brand/40 hover:bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${hasNewApplications ? "bg-brand/10 opacity-100" : "opacity-0"}`}>
              <span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
            </span>
            <p className="truncate font-semibold text-ink">{option.tender.title}</p>
          </div>
          <p className="mt-1 text-xs text-ink-muted">{option.tender.countryScope || option.tender.lanes || "No scope"}</p>
        </div>
        <Badge variant={option.stage.variant}>{option.stage.label}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <span className="rounded-lg border border-border-ui bg-surface px-2 py-2 text-xs font-semibold text-ink-muted">
          {option.applicationCount} applications
        </span>
        <span className="rounded-lg border border-border-ui bg-surface px-2 py-2 text-xs font-semibold text-ink-muted">
          {option.pendingCount} pending
        </span>
        <span className="rounded-lg border border-border-ui bg-surface px-2 py-2 text-xs font-semibold text-ink-muted">
          {option.acceptedCount}/{option.awardSlots} awarded
        </span>
      </div>
    </button>
  );
}

function CandidateReviewCard({
  application,
  structured,
  scorecard,
  awardFilled,
  pendingAction,
  onView,
  onShortlist,
  onAccept,
  onReject,
}: {
  application: LiveTenderApplication;
  structured: ReturnType<typeof toStructuredApplication>;
  scorecard: CandidateScorecard;
  awardFilled: boolean;
  pendingAction: string | null;
  onView: () => void;
  onShortlist: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const pending = pendingAction?.startsWith(`${application.id}:`) ?? false;
  const accepted = application.status === "accepted";
  const rejected = application.status === "rejected";
  const canAccept = !accepted && !pending && !awardFilled;
  const aiInsight = getAiInsight(scorecard);

  return (
    <article className="overflow-hidden rounded-2xl border border-border-ui bg-surface shadow-sm transition hover:border-brand/30 hover:shadow-md">
      <div className="border-b border-border-ui bg-surface2 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink">{application.gsaName}</p>
            <p className="mt-1 text-sm text-ink-muted">{structured.country} - {application.contactName}</p>
          </div>
          <ScoreRing value={scorecard.overallFit} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge application={application} />
          <RiskBadge risk={scorecard.riskLevel} />
          <Badge variant="muted">{structured.documentsCount} docs</Badge>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreTile label="Market" value={scorecard.marketCoverageScore} />
          <ScoreTile label="Sales" value={scorecard.salesStrengthScore} />
          <ScoreTile label="Cargo" value={scorecard.cargoCapabilityScore} />
          <ScoreTile label="Commercial" value={scorecard.commercialPlanScore} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Strengths</p>
          <div className="flex flex-wrap gap-2">
            {structured.strengths.map((strength) => (
              <span key={strength} className="rounded-full border border-border-ui bg-surface2 px-3 py-1 text-xs font-semibold text-ink-muted">
                {strength}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <InfoMini label="Coverage" value={getCoverageScopeLabel(application, structured)} />
          <InfoMini label="Monthly tonnage" value={structured.expectedMonthlyTonnage} />
          <InfoMini label="Capabilities" value={structured.cargoCapabilities.slice(0, 4).join(", ") || "Not provided"} wide />
        </div>

        <p className="rounded-xl border border-border-ui bg-surface2 p-3 text-sm leading-6 text-ink-muted">{aiInsight}</p>

        <div className="flex flex-wrap gap-2 border-t border-border-ui pt-4">
          <Button variant="outline" onClick={onView}>
            <Eye className="h-4 w-4" />
            View full application
          </Button>
          <Button
            variant={application.status === "shortlisted" ? "outline" : "secondary"}
            disabled={pending || accepted}
            onClick={onShortlist}
          >
            <Star className="h-4 w-4" />
            {application.status === "shortlisted" ? "Remove shortlist" : "Shortlist"}
          </Button>
          <Button disabled={!canAccept && !accepted} onClick={onAccept}>
            <Trophy className="h-4 w-4" />
            {accepted ? "Awarded" : awardFilled ? "Award filled" : "Award"}
          </Button>
          <Button variant="destructive" disabled={pending || accepted || rejected} onClick={onReject}>
            {rejected ? "Rejected" : pendingAction === `${application.id}:rejected` ? "Rejecting..." : "Reject"}
          </Button>
        </div>

        {accepted && (
          <Button asChild variant="outline" className="w-full">
            <Link href="/airline/gsa/overview">
              Setup partner profile
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}

function ApplicationDrawer({
  application,
  structured,
  scorecard,
  onClose,
}: {
  application: LiveTenderApplication;
  structured: ReturnType<typeof toStructuredApplication>;
  scorecard: CandidateScorecard;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/55 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close application details" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-border-ui bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border-ui p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Full application</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">{application.gsaName}</h2>
            <p className="mt-1 text-sm text-ink-muted">{structured.country} - {application.contactName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className={`rounded-2xl border p-4 ${getRecommendationPanelClass(scorecard)}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <ScoreRing value={scorecard.overallFit} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-current opacity-75">Recommendation</p>
                  <RiskBadge risk={scorecard.riskLevel} />
                </div>
                <p className="mt-2 text-xl font-semibold text-ink">{scorecard.recommendation}</p>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{getRecommendationAction(scorecard)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <DrawerScoreMetric label="Market" value={scorecard.marketCoverageScore} />
              <DrawerScoreMetric label="Sales" value={scorecard.salesStrengthScore} />
              <DrawerScoreMetric label="Cargo" value={scorecard.cargoCapabilityScore} />
              <DrawerScoreMetric label="Commercial" value={scorecard.commercialPlanScore} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DecisionSignalCard
              title="What supports this bid"
              items={structured.strengths.length ? structured.strengths.slice(0, 5) : ["No strong signal detected yet"]}
              tone="positive"
            />
            <DecisionSignalCard
              title="What needs attention"
              items={getApplicationGaps(application, structured, scorecard)}
              tone="risk"
            />
          </div>

          <div className="rounded-2xl border border-border-ui bg-surface2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">Application snapshot</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">Grouped by how the airline will compare this bid.</p>
              </div>
              <Badge>{structured.documentsCount} doc{structured.documentsCount === 1 ? "" : "s"}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <SnapshotSection title="Coverage fit" helper="Where this GSA says it can actively cover the mandate.">
                <SnapshotFact label="Coverage scope" value={getCoverageScopeLabel(application, structured)} />
                <SnapshotFact label="Monthly target" value={structured.expectedMonthlyTonnage} />
              </SnapshotSection>
              <SnapshotSection title="Commercial offer" helper="Commercial commitments the airline can compare across bids.">
                <SnapshotFact label="Proposal" value={application.proposedCommission} />
                <SnapshotFact label="Account coverage" value={application.namedAccountCoverage || "Not provided"} />
              </SnapshotSection>
              <SnapshotSection title="Execution readiness" helper="How the GSA plans to activate after award.">
                <SnapshotFact label="Sales activation" value={structured.salesStrategy} wide />
                <SnapshotFact label="Launch readiness" value={structured.first90DaysPlan} wide />
                <SnapshotFact label="Launch timeline" value={application.launchTimeline} />
                <SnapshotFact label="Cargo capability" value={structured.cargoCapabilities.join(", ") || "Not provided"} />
              </SnapshotSection>
              <SnapshotSection title="Company context" helper="Profile information, not the primary decision driver.">
                <SnapshotFact label="Profile" value={structured.companyProfile} wide />
              </SnapshotSection>
            </div>
          </div>
        </div>

        <div className="border-t border-border-ui p-5">
          <Button asChild variant="outline" className="w-full">
            <Link href={`/airline/applications/${application.id}`}>
              Open full application page
              <FileText className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </aside>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const color = getScoreColor(value);
  return (
    <div
      className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${value * 3.6}deg, var(--surface3) 0deg)` }}
      aria-label={`Fit score ${value} out of 100`}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-surface text-center">
        <span className="text-lg font-bold leading-none text-ink">{value}</span>
        <span className="text-[9px] font-semibold uppercase text-ink-muted">fit</span>
      </div>
    </div>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  const color = getScoreColor(value);
  return (
    <div className="rounded-xl border border-border-ui bg-surface2 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface3">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function DrawerScoreMetric({ label, value }: { label: string; value: number }) {
  const color = getScoreColor(value);
  return (
    <div className="rounded-xl border border-white/40 bg-white/45 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
        <p className="text-sm font-bold text-ink">{value}</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface3">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function DecisionSignalCard({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "risk" }) {
  const isPositive = tone === "positive";
  return (
    <div className={`rounded-2xl border p-4 ${isPositive ? "border-success/20 bg-success-bg/40" : "border-warning/25 bg-warning-bg/35"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${isPositive ? "text-success" : "text-warning"}`}>{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isPositive
                ? "border-success/20 bg-surface text-success"
                : "border-warning/25 bg-surface text-warning"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function SnapshotSection({
  title,
  helper,
  children,
}: {
  title: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-ui bg-surface p-4">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">{helper}</p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function SnapshotFact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-border-ui bg-surface2 p-3 ${wide ? "md:col-span-2" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-1.5 text-sm font-medium leading-6 text-ink">{value || "Not provided"}</p>
    </div>
  );
}

function InfoMini({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-border-ui bg-surface2 p-3 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-ink">{value || "Not provided"}</p>
    </div>
  );
}

function StatusBadge({ application }: { application: LiveTenderApplication }) {
  const variant = application.status === "accepted"
    ? "success"
    : application.status === "shortlisted"
      ? "warning"
      : application.status === "rejected"
        ? "danger"
        : "muted";
  return (
    <Badge variant={variant}>
      {capitalize(application.status)}
    </Badge>
  );
}

function RiskBadge({ risk }: { risk: CandidateScorecard["riskLevel"] }) {
  const variant = risk === "Low" ? "success" : risk === "Medium" ? "warning" : "danger";
  return (
    <Badge variant={variant} className="gap-1">
      <ShieldAlert className="h-3.5 w-3.5" />
      {risk} risk
    </Badge>
  );
}

function getRecommendationPanelClass(scorecard: CandidateScorecard) {
  if (scorecard.recommendation === "Strong contender") return "border-success/25 bg-success-bg/55 text-success";
  if (scorecard.recommendation === "Shortlist") return "border-brand/25 bg-brand-light text-brand";
  if (scorecard.recommendation === "Review carefully") return "border-warning/30 bg-warning-bg/50 text-warning";
  return "border-danger/25 bg-danger-bg/50 text-danger";
}

function getRecommendationAction(scorecard: CandidateScorecard) {
  if (scorecard.recommendation === "Strong contender") {
    return `High fit at ${scorecard.overallFit}/100. Move to award or final commercial validation.`;
  }
  if (scorecard.recommendation === "Shortlist") {
    return `Good candidate at ${scorecard.overallFit}/100. Shortlist and validate the weaker signals before award.`;
  }
  if (scorecard.recommendation === "Review carefully") {
    return `Mixed fit at ${scorecard.overallFit}/100. Clarify the gaps before moving this GSA forward.`;
  }
  return `Low fit at ${scorecard.overallFit}/100. Reject unless there is a strategic reason to keep the bid.`;
}

function getApplicationGaps(
  application: LiveTenderApplication,
  structured: ReturnType<typeof toStructuredApplication>,
  scorecard: CandidateScorecard,
) {
  const gaps = [
    scorecard.marketCoverageScore < 60 ? "Market coverage needs validation" : "",
    scorecard.salesStrengthScore < 60 ? "Sales proof is weak" : "",
    scorecard.cargoCapabilityScore < 60 ? "Cargo capability mismatch" : "",
    scorecard.commercialPlanScore < 60 ? "Commercial plan needs detail" : "",
    !application.monthlySalesTarget ? "Monthly target missing" : "",
    !application.launchTimeline ? "Launch timeline missing" : "",
    structured.documentsCount === 0 ? "No supporting documents" : "",
  ].filter(Boolean);

  return gaps.length ? gaps.slice(0, 5) : ["No major gaps flagged"];
}

function getCoverageScopeLabel(
  application: LiveTenderApplication,
  structured: ReturnType<typeof toStructuredApplication>,
) {
  const selectedScope = [...application.markets, ...application.coverage].filter(Boolean);
  if (selectedScope.length > 0) return Array.from(new Set(selectedScope)).join(", ");
  if (structured.coveredAirports.length > 0) return structured.coveredAirports.join(", ");
  if (structured.offices.length > 0) return structured.offices.join(", ");
  return "Not selected in application";
}

function getAiInsight(scorecard: CandidateScorecard) {
  const action =
    scorecard.recommendation === "Strong contender"
      ? "Best next step: move quickly to award or final commercial validation."
      : scorecard.recommendation === "Shortlist"
        ? "Best next step: shortlist and validate the missing readiness or commercial signals."
        : scorecard.recommendation === "Review carefully"
          ? "Best next step: request clarification before advancing."
          : "Best next step: do not advance unless strategic context changes.";

  return `${scorecard.summary} ${action}`;
}

function getScoreColor(value: number) {
  if (value < 40) return "#DC2626";
  if (value <= 70) return "#D97706";
  return "#059669";
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-ui bg-surface2 p-10 text-center">
      <Inbox className="h-10 w-10 text-ink-muted/40" />
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-muted">{text}</p>
      </div>
    </div>
  );
}

function countStatus(applications: LiveTenderApplication[], status: ApplicationStatusFilter) {
  if (status === "all") return applications.length;
  return applications.filter((application) => application.status === status).length;
}

function getAwardSlots(tender: LiveTender) {
  if (tender.awardMode === "multi") return Math.max(2, tender.maxAwards ?? 2);
  return Math.max(1, tender.maxAwards ?? 1);
}

function statusRank(status: Status) {
  const order: Record<string, number> = {
    shortlisted: 0,
    pending: 1,
    accepted: 2,
    rejected: 3,
  };
  return order[status] ?? 9;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

