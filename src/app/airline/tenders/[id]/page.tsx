"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Globe2,
  Package,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LiveTender, LiveTenderApplication } from "@/lib/services/tender-workflow-store";
import {
  getApplicationsForTender,
  getTenderAirports,
  getTenderCargoTypes,
  getTenderIntelligenceSummary,
  getTenderStage,
  scoreCandidate,
  toStructuredApplication,
  type CandidateScorecard,
} from "@/lib/tender-workspace";
import type { Status } from "@/lib/types";

type TenderTab = "overview" | "requirements" | "applications" | "evaluation" | "award";

const tabs: Array<{ id: TenderTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "Requirements" },
  { id: "applications", label: "Applications" },
  { id: "evaluation", label: "Evaluation" },
  { id: "award", label: "Award" },
];

export default function TenderWorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const tenderId = params.id;
  const [tender, setTender] = useState<LiveTender | null>(null);
  const [applications, setApplications] = useState<LiveTenderApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TenderTab>("overview");
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string>("");
  const [decisionNote, setDecisionNote] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch(`/api/tenders/${tenderId}`).then((res) => (res.ok ? res.json() : { tender: null })),
      fetch("/api/applications").then((res) => (res.ok ? res.json() : { applications: [] })),
    ])
      .then(([tenderData, applicationData]) => {
        if (!active) return;
        setTender(tenderData.tender ?? null);
        setApplications(getApplicationsForTender(tenderId, applicationData.applications ?? []));
      })
      .catch(() => {
        if (!active) return;
        setTender(null);
        setApplications([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenderId]);

  const stage = tender ? getTenderStage(tender, applications) : null;
  const shortlistedCount = applications.filter((application) => application.status === "shortlisted").length;
  const acceptedApplication = applications.find((application) => application.status === "accepted") ?? null;
  const selectedApplication = selectedApplicationId
    ? applications.find((application) => application.id === selectedApplicationId) ?? null
    : null;
  const scorecards = useMemo(() => {
    if (!tender) return [];
    return applications
      .map((application) => ({
        application,
        structured: toStructuredApplication(tender, application),
        scorecard: scoreCandidate(tender, application),
      }))
      .sort((left, right) => right.scorecard.overallFit - left.scorecard.overallFit);
  }, [applications, tender]);
  const visibleScorecards = scorecards.filter(({ application, structured }) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${application.gsaName} ${structured.country} ${structured.coveredAirports.join(" ")} ${structured.cargoCapabilities.join(" ")}`.toLowerCase().includes(needle);
  });

  if (loading) {
    return (
      <>
        <Topbar title="Tender Workspace" subtitle="Loading" />
        <main className="p-5">
          <Card>
            <CardContent className="p-8 text-sm text-ink-muted">Loading tender workspace...</CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (!tender || !stage) {
    return (
      <>
        <Topbar title="Tender not found" subtitle="Tender Workspace" />
        <main className="p-5">
          <Card>
            <CardContent className="p-8">
              <p className="font-semibold text-ink">Tender not found</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/airline/tenders">Back to tenders</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Tender Workspace" subtitle={tender.airline} />
      <main className="space-y-5 p-5">
        <Button asChild variant="outline" size="sm">
          <Link href="/airline/tenders">
            <ArrowLeft className="h-4 w-4" />
            Back to Tender Dashboard
          </Link>
        </Button>

        <section className="overflow-hidden rounded-2xl border border-border-ui bg-surface shadow-sm">
          <div className="border-b border-border-ui bg-surface2 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{tender.airline}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{tender.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={stage.variant}>{stage.label}</Badge>
                  <HeaderPill icon={CalendarDays} label={`Deadline ${tender.deadline || "not set"}`} />
                  <HeaderPill icon={UsersRound} label={`${applications.length} applications`} />
                  <HeaderPill icon={ClipboardCheck} label={`${shortlistedCount} shortlisted`} />
                </div>
              </div>
              <div className="min-w-[240px] rounded-xl border border-border-ui bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Workspace progress</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface3">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${stage.progress}%` }} />
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{stage.progress}% complete</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto px-5 py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-brand text-white shadow-[0_2px_8px_rgba(26,90,255,0.22)]"
                    : "text-ink-muted hover:bg-surface2 hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

        {activeTab === "overview" && (
          <OverviewTab tender={tender} applications={applications} />
        )}

        {activeTab === "requirements" && (
          <RequirementsTab tender={tender} />
        )}

        {activeTab === "applications" && (
          <ApplicationsTab
            tender={tender}
            scorecards={visibleScorecards}
            query={query}
            selectedApplication={selectedApplication}
            onQueryChange={setQuery}
            onView={(applicationId) => setSelectedApplicationId(applicationId)}
            onCloseView={() => setSelectedApplicationId(null)}
            onShortlist={(application) => updateApplicationStatus(application, application.status === "shortlisted" ? "pending" : "shortlisted")}
            pendingAction={pendingAction}
          />
        )}

        {activeTab === "evaluation" && (
          <EvaluationTab scorecards={scorecards} />
        )}

        {activeTab === "award" && (
          <AwardTab
            tender={tender}
            scorecards={scorecards}
            winnerId={winnerId || acceptedApplication?.id || ""}
            decisionNote={decisionNote}
            acceptedApplication={acceptedApplication}
            onWinnerChange={setWinnerId}
            onDecisionNoteChange={setDecisionNote}
            onMarkAwarded={() => {
              const winner = applications.find((application) => application.id === (winnerId || acceptedApplication?.id));
              if (winner) updateApplicationStatus(winner, "accepted");
            }}
            onCloseTender={closeTender}
            pendingAction={pendingAction}
          />
        )}
      </main>
    </>
  );

  async function updateApplicationStatus(
    application: LiveTenderApplication,
    status: Extract<Status, "pending" | "shortlisted" | "accepted" | "rejected">,
  ) {
    setPendingAction(`${application.id}:${status}`);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Application could not be updated");
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
      if (data.tender) setTender(data.tender);
    } finally {
      setPendingAction(null);
    }
  }

  async function closeTender() {
    if (!tender) return;
    setPendingAction("close-tender");
    setError(null);
    try {
      const res = await fetch(`/api/tenders/${tender.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Tender could not be closed");
        return;
      }
      setTender(data.tender);
    } finally {
      setPendingAction(null);
    }
  }
}

function OverviewTab({ tender, applications }: { tender: LiveTender; applications: LiveTenderApplication[] }) {
  const airports = getTenderAirports(tender);
  const cargoTypes = getTenderCargoTypes(tender);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_.75fr]">
      <Card>
        <CardHeader>
          <CardTitle>Mandate summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <InfoTile icon={Globe2} label="Market" value={tender.countryScope || tender.regions.join(", ") || "Not set"} />
          <InfoTile icon={Target} label="Airports" value={airports.join(", ") || tender.lanes || "Market-wide"} />
          <InfoTile icon={Package} label="Cargo focus" value={cargoTypes.join(", ") || tender.productMix || "Not set"} />
          <InfoTile icon={BarChart3} label="Commercial goal" value={tender.commercialExpectations || "Commercial plan requested from applicants"} />
          <InfoTile icon={CalendarDays} label="Timeline" value={`Deadline ${tender.deadline || "-"} / Start ${tender.expectedStart || "-"}`} />
          <InfoTile icon={UsersRound} label="Applications" value={`${applications.length} submitted`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            Tender Intelligence Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-ink-muted">{getTenderIntelligenceSummary(tender, applications)}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function RequirementsTab({ tender }: { tender: LiveTender }) {
  const mandatory = tender.requirements.filter((item) => /experience|certification|required|iata|cass|must/i.test(item));
  const preferred = tender.requirements.filter((item) => !mandatory.includes(item));
  const commercial = tender.commercialExpectations
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <RequirementPanel title="Mandatory Requirements" tone="brand" items={mandatory.length ? mandatory : tender.requirements.slice(0, 3)} />
      <RequirementPanel title="Preferred Requirements" tone="muted" items={preferred.length ? preferred : ["Local account relationships", "Cargo sales reporting discipline", "Launch team readiness"]} />
      <RequirementPanel title="Commercial Expectations" tone="warning" items={commercial.length ? commercial : ["Submit sales plan", "Declare monthly tonnage target", "Explain commission or incentive expectations"]} />
    </div>
  );
}

function ApplicationsTab({
  tender,
  scorecards,
  query,
  selectedApplication,
  onQueryChange,
  onView,
  onCloseView,
  onShortlist,
  pendingAction,
}: {
  tender: LiveTender;
  scorecards: Array<{ application: LiveTenderApplication; structured: ReturnType<typeof toStructuredApplication>; scorecard: CandidateScorecard }>;
  query: string;
  selectedApplication: LiveTenderApplication | null;
  onQueryChange: (value: string) => void;
  onView: (applicationId: string) => void;
  onCloseView: () => void;
  onShortlist: (application: LiveTenderApplication) => void;
  pendingAction: string | null;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input value={query} onChange={(event) => onQueryChange(event.target.value)} className="pl-9" placeholder="Search GSA, country, airport, capability..." />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {scorecards.map(({ application, structured, scorecard }) => (
          <CandidateCard
            key={application.id}
            tender={tender}
            application={application}
            structured={structured}
            scorecard={scorecard}
            onView={() => onView(application.id)}
            onShortlist={() => onShortlist(application)}
            pending={pendingAction === `${application.id}:shortlisted`}
          />
        ))}
      </div>

      {selectedApplication && (
        <ApplicationDetailPanel tender={tender} application={selectedApplication} onClose={onCloseView} />
      )}
    </div>
  );
}

function EvaluationTab({
  scorecards,
}: {
  scorecards: Array<{ application: LiveTenderApplication; structured: ReturnType<typeof toStructuredApplication>; scorecard: CandidateScorecard }>;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-3">
        {scorecards.map(({ application, scorecard }) => (
          <Scorecard key={application.id} application={application} scorecard={scorecard} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidate comparison</CardTitle>
          <p className="text-sm text-ink-muted">Side-by-side view of scoring signals used for shortlist and award decisions.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border-ui text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <th className="pb-3 pr-4 text-left">GSA</th>
                <th className="pb-3 pr-4 text-left">Overall</th>
                <th className="pb-3 pr-4 text-left">Market</th>
                <th className="pb-3 pr-4 text-left">Sales</th>
                <th className="pb-3 pr-4 text-left">Cargo</th>
                <th className="pb-3 pr-4 text-left">Commercial</th>
                <th className="pb-3 pr-4 text-left">Risk</th>
                <th className="pb-3 text-left">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-ui">
              {scorecards.map(({ application, scorecard }) => (
                <tr key={application.id}>
                  <td className="py-4 pr-4 font-semibold text-ink">{application.gsaName}</td>
                  <td className="py-4 pr-4">{scorecard.overallFit}</td>
                  <td className="py-4 pr-4">{scorecard.marketCoverageScore}</td>
                  <td className="py-4 pr-4">{scorecard.salesStrengthScore}</td>
                  <td className="py-4 pr-4">{scorecard.cargoCapabilityScore}</td>
                  <td className="py-4 pr-4">{scorecard.commercialPlanScore}</td>
                  <td className="py-4 pr-4"><RiskBadge risk={scorecard.riskLevel} /></td>
                  <td className="py-4 text-ink-muted">{scorecard.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function AwardTab({
  tender,
  scorecards,
  winnerId,
  decisionNote,
  acceptedApplication,
  onWinnerChange,
  onDecisionNoteChange,
  onMarkAwarded,
  onCloseTender,
  pendingAction,
}: {
  tender: LiveTender;
  scorecards: Array<{ application: LiveTenderApplication; structured: ReturnType<typeof toStructuredApplication>; scorecard: CandidateScorecard }>;
  winnerId: string;
  decisionNote: string;
  acceptedApplication: LiveTenderApplication | null;
  onWinnerChange: (value: string) => void;
  onDecisionNoteChange: (value: string) => void;
  onMarkAwarded: () => void;
  onCloseTender: () => void;
  pendingAction: string | null;
}) {
  const selected = scorecards.find((item) => item.application.id === winnerId) ?? null;
  const awardSummary = selected
    ? `${selected.application.gsaName} is recommended for ${tender.title} based on ${selected.scorecard.overallFit}/100 overall fit, ${selected.scorecard.marketCoverageScore}/100 market coverage, and ${selected.scorecard.commercialPlanScore}/100 commercial plan strength. ${decisionNote || "Internal decision note not added yet."}`
    : "Select a winning GSA to generate the award summary.";

  return (
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Select winner</CardTitle>
          <p className="text-sm text-ink-muted">Choose one GSA, document the decision, then mark the tender as awarded.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">Winning GSA</span>
            <select
              value={winnerId}
              onChange={(event) => onWinnerChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-border-ui bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">Select candidate</option>
              {scorecards.map(({ application, scorecard }) => (
                <option key={application.id} value={application.id}>
                  {application.gsaName} - {scorecard.overallFit}/100
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">Internal decision note</span>
            <Textarea value={decisionNote} onChange={(event) => onDecisionNoteChange(event.target.value)} placeholder="Why this GSA was selected, commercial rationale, risks, and next steps..." />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" disabled={!selected}>
              Generate Award Letter
            </Button>
            <Button disabled={!selected || Boolean(pendingAction)} onClick={onMarkAwarded}>
              <Trophy className="h-4 w-4" />
              {pendingAction?.endsWith(":accepted") ? "Awarding..." : "Mark as Awarded"}
            </Button>
          </div>
          <Button variant="outline" className="w-full" disabled={Boolean(pendingAction)} onClick={onCloseTender}>
            Close Tender
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-brand" />
            Award summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {acceptedApplication && (
            <div className="rounded-xl border border-[#0B7A52]/20 bg-success-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-success">Selected GSA</p>
              <p className="mt-2 text-lg font-semibold text-ink">{acceptedApplication.gsaName}</p>
            </div>
          )}
          <p className="text-sm leading-7 text-ink-muted">{awardSummary}</p>
          <div className="rounded-xl border border-border-ui bg-surface2 p-4">
            <p className="font-semibold text-ink">Next steps</p>
            <ul className="mt-2 space-y-2 text-sm text-ink-muted">
              <li>Confirm commercial decision internally.</li>
              <li>Send award letter and request countersignature.</li>
              <li>Move accepted GSA into Partner Profiles for route and target setup.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CandidateCard({
  application,
  structured,
  scorecard,
  onView,
  onShortlist,
  pending,
}: {
  tender: LiveTender;
  application: LiveTenderApplication;
  structured: ReturnType<typeof toStructuredApplication>;
  scorecard: CandidateScorecard;
  onView: () => void;
  onShortlist: () => void;
  pending: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-ink">{application.gsaName}</p>
            <p className="mt-1 text-sm text-ink-muted">{structured.country}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-ink">{scorecard.overallFit}</p>
            <p className="text-xs text-ink-muted">match score</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={application.status === "shortlisted" ? "warning" : application.status === "accepted" ? "success" : "muted"}>
            {application.status}
          </Badge>
          <RiskBadge risk={scorecard.riskLevel} />
        </div>
        <div className="grid gap-2">
          {structured.strengths.map((strength) => (
            <span key={strength} className="rounded-lg border border-border-ui bg-surface2 px-3 py-2 text-sm text-ink-muted">
              {strength}
            </span>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={onView}>View Application</Button>
          <Button
            variant={application.status === "shortlisted" ? "outline" : "default"}
            disabled={pending || application.status === "accepted"}
            onClick={onShortlist}
          >
            {pending ? "Updating..." : application.status === "shortlisted" ? "Remove shortlist" : "Shortlist"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationDetailPanel({ tender, application, onClose }: { tender: LiveTender; application: LiveTenderApplication; onClose: () => void }) {
  const structured = toStructuredApplication(tender, application);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>{structured.gsaName}</CardTitle>
          <p className="text-sm text-ink-muted">Structured application profile</p>
        </div>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailBlock label="Company profile" value={structured.companyProfile} />
        <DetailBlock label="Country" value={structured.country} />
        <DetailBlock label="Offices" value={structured.offices.join(", ")} />
        <DetailBlock label="Team size" value={`${structured.teamSize} cargo sales staff`} />
        <DetailBlock label="Years in cargo sales" value={`${structured.yearsInCargoSales} years`} />
        <DetailBlock label="Current airline representations" value={structured.currentAirlineRepresentations.join(", ")} />
        <DetailBlock label="Covered airports" value={structured.coveredAirports.join(", ") || "Not provided"} />
        <DetailBlock label="Key customer segments" value={structured.keyCustomerSegments.join(", ")} />
        <DetailBlock label="Cargo capabilities" value={structured.cargoCapabilities.join(", ")} />
        <DetailBlock label="Sales strategy" value={structured.salesStrategy} wide />
        <DetailBlock label="Expected monthly tonnage" value={structured.expectedMonthlyTonnage} />
        <DetailBlock label="First 90 days plan" value={structured.first90DaysPlan} wide />
        <DetailBlock label="Uploaded documents" value={`${structured.documentsCount} document placeholder${structured.documentsCount === 1 ? "" : "s"}`} />
      </CardContent>
    </Card>
  );
}

function Scorecard({ application, scorecard }: { application: LiveTenderApplication; scorecard: CandidateScorecard }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{application.gsaName}</CardTitle>
            <p className="text-sm text-ink-muted">{scorecard.recommendation}</p>
          </div>
          <Badge variant={scorecard.overallFit >= 84 ? "success" : scorecard.overallFit >= 72 ? "warning" : "muted"}>
            {scorecard.overallFit}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScoreRow label="Market Coverage" value={scorecard.marketCoverageScore} />
        <ScoreRow label="Sales Strength" value={scorecard.salesStrengthScore} />
        <ScoreRow label="Cargo Capability" value={scorecard.cargoCapabilityScore} />
        <ScoreRow label="Commercial Plan" value={scorecard.commercialPlanScore} />
        <div className="flex items-center justify-between rounded-lg border border-border-ui bg-surface2 p-3">
          <span className="text-sm text-ink-muted">Risk Level</span>
          <RiskBadge risk={scorecard.riskLevel} />
        </div>
        <p className="text-sm leading-6 text-ink-muted">{scorecard.summary}</p>
      </CardContent>
    </Card>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface3">
        <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function RequirementPanel({ title, tone, items }: { title: string; tone: "brand" | "warning" | "muted"; items: string[] }) {
  const className = {
    brand: "border-brand/20 bg-brand-light",
    warning: "border-[#B45309]/25 bg-warning-bg",
    muted: "border-border-ui bg-surface2",
  }[tone];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-border-ui bg-surface px-4 py-3 text-sm leading-6 text-ink">
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface2 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        <Icon className="h-4 w-4 text-brand" />
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}

function HeaderPill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border-ui bg-surface px-3 py-1 text-xs font-semibold text-ink-muted">
      <Icon className="h-3.5 w-3.5 text-brand" />
      {label}
    </span>
  );
}

function DetailBlock({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-border-ui bg-surface2 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-ink">{value || "Not provided"}</p>
    </div>
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
