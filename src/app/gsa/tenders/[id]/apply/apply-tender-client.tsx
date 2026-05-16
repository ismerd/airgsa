"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  DollarSign,
  MapPin,
  Paperclip,
  Rocket,
  Users,
} from "lucide-react";
import { AiTextButton } from "@/components/ai/ai-text-button";
import { DocumentList } from "@/components/dashboard/document-list";
import { FileDropzone, type DroppedFile } from "@/components/dashboard/file-dropzone";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RealGsaPartner } from "@/lib/real-gsa-data";
import type { LiveTender, LiveTenderApplication, TenderRouteFrequency } from "@/lib/services/tender-workflow-store";

type FormState = {
  proposedCommission: string;
  launchTimeline: string;
  namedAccountCoverage: string;
  monthlySalesTarget: string;
  networkPlan: string;
  operationalReadiness: string;
};

type FitScore = {
  total: number;
  commercial: number;
  coverage: number;
  execution: number;
  documents: number;
};

export function ApplyTenderClient({ tenderId, gsa }: { tenderId: string; gsa: RealGsaPartner }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tender, setTender] = useState<LiveTender | null>(null);
  const [application, setApplication] = useState<LiveTenderApplication | null>(null);
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [coveredItems, setCoveredItems] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormState>({
    proposedCommission: "",
    launchTimeline: "",
    namedAccountCoverage: "",
    monthlySalesTarget: "",
    networkPlan: "",
    operationalReadiness: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchJson(url: string) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} returned ${res.status}`);
      return res.json();
    }
    Promise.all([fetchJson(`/api/tenders/${tenderId}`), fetchJson("/api/applications")])
      .then(([tenderData, appData]) => {
        if (!active) return;
        setTender(tenderData.tender ?? null);
        const existing =
          (appData.applications ?? []).find(
            (item: LiveTenderApplication) => item.tenderId === tenderId && item.gsaId === gsa.id,
          ) ?? null;
        setApplication(existing);
        if (existing) {
          setForm({
            proposedCommission: existing.proposedCommission,
            launchTimeline: existing.launchTimeline,
            namedAccountCoverage: existing.namedAccountCoverage,
            monthlySalesTarget: existing.monthlySalesTarget,
            networkPlan: existing.networkPlan,
            operationalReadiness: existing.operationalReadiness,
          });
          setFiles(existing.documents);
        }
      })
      .catch(() => {
        if (active) setError("Tender data could not be loaded.");
      });
    return () => { active = false; };
  }, [gsa.id, tenderId]);

  const canEdit =
    !application ||
    (application.status === "pending" &&
      Date.now() - new Date(application.submittedAt).getTime() < 24 * 60 * 60 * 1000);

  const fit: FitScore = useMemo(() => {
    let commercial = 0;
    if (form.proposedCommission.trim()) commercial += 13;
    if (form.launchTimeline.trim()) commercial += 7;
    if (form.monthlySalesTarget.trim()) commercial += 5;
    commercial = Math.min(25, commercial);

    let coverage = 0;
    const coverageBase = tender?.routes?.length
      ? tender.routes.length
      : tender?.regions?.length ?? 0;
    if (coverageBase > 0) {
      coverage = Math.round((coveredItems.size / coverageBase) * 25);
    } else if (form.namedAccountCoverage.trim().length > 20) {
      coverage = 25;
    } else if (form.namedAccountCoverage.trim()) {
      coverage = 12;
    }

    let execution = 0;
    if (form.networkPlan.trim().length > 100) execution += 15;
    else if (form.networkPlan.trim().length > 20) execution += 8;
    if (form.operationalReadiness.trim().length > 100) execution += 10;
    else if (form.operationalReadiness.trim().length > 20) execution += 5;
    execution = Math.min(25, execution);

    const documents = Math.min(25, files.length * 7);
    return { total: commercial + coverage + execution + documents, commercial, coverage, execution, documents };
  }, [form, files, coveredItems, tender]);

  function toggleItem(id: string) {
    setCoveredItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, documents: files }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Application could not be submitted.");
        return;
      }
      router.push("/gsa");
    } catch {
      setError("Application could not be submitted. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const step1Complete = Boolean(form.proposedCommission.trim() && form.launchTimeline.trim());
  const step2Complete = coveredItems.size > 0 || form.namedAccountCoverage.trim().length > 0;

  return (
    <>
      <Topbar
        title={application ? "Your application" : "Apply to tender"}
        subtitle={tender?.title ?? "GSA application"}
      />
      <main className="space-y-5 p-5">

        {/* ── Step Indicator ── */}
        {canEdit && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center">
                {(
                  [
                    { n: 1 as const, label: "Commercial Terms", Icon: DollarSign },
                    { n: 2 as const, label: "Market Coverage", Icon: MapPin },
                    { n: 3 as const, label: "Execution Plan", Icon: Rocket },
                  ] as const
                ).map((s, i) => (
                  <Fragment key={s.n}>
                    <button
                      type="button"
                      onClick={() => setStep(s.n)}
                      className="flex items-center gap-2.5 group"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                          step === s.n
                            ? "border-brand bg-brand text-white shadow-md shadow-brand/30"
                            : step > s.n
                            ? "border-brand bg-brand-light text-brand"
                            : "border-border-ui bg-surface text-ink-muted"
                        }`}
                      >
                        {step > s.n ? <Check className="h-3.5 w-3.5" /> : <s.Icon className="h-3.5 w-3.5" />}
                      </div>
                      <span
                        className={`hidden text-sm font-semibold sm:block transition-colors ${
                          step === s.n ? "text-ink" : "text-ink-muted"
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                    {i < 2 && (
                      <div
                        className={`mx-3 h-px flex-1 transition-colors ${
                          step > s.n ? "bg-brand" : "bg-border-ui"
                        }`}
                      />
                    )}
                  </Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 xl:grid-cols-[1fr_.38fr]">

          {/* ── Step Content ── */}
          <div className="space-y-5">

            {/* STEP 1 — Commercial Terms */}
            {(step === 1 || !canEdit) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-brand" />
                    {tender ? getProposalTitle(tender) : "Commercial terms"}
                  </CardTitle>
                  <p className="text-sm text-ink-muted">
                    {canEdit
                      ? "Build the proposal around the actual mandate — this is what the airline compares first."
                      : "The 24-hour edit window has closed. This application is read-only."}
                  </p>
                </CardHeader>

                {tender && (
                  <div className="mx-6 mb-4 grid gap-3 md:grid-cols-3">
                    <TenderRuleChip label="Award" value={getAwardLabel(tender)} helper={getAwardHelper(tender)} />
                    <TenderRuleChip label="Commercial model" value={getCommercialLabel(tender)} helper={getCommercialHelper(tender)} />
                    <TenderRuleChip label="Decision focus" value={getDecisionFocus(tender)} helper="This is what the airline compares first across all bids." />
                  </div>
                )}

                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 space-y-1.5">
                    <Input
                      disabled={!canEdit}
                      placeholder={tender ? getCommercialPlaceholder(tender) : "Proposed commission or commercial terms"}
                      value={form.proposedCommission}
                      onChange={(e) => setForm({ ...form, proposedCommission: e.target.value })}
                    />
                    {canEdit && (
                      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
                        Typical winning range for similar mandates: <span className="font-semibold text-ink">4 – 6% base commission</span>
                      </p>
                    )}
                  </div>
                  <Input
                    disabled={!canEdit}
                    placeholder="Launch timeline, e.g. 6 weeks from award"
                    value={form.launchTimeline}
                    onChange={(e) => setForm({ ...form, launchTimeline: e.target.value })}
                  />
                  <Input
                    disabled={!canEdit}
                    placeholder="Monthly sales target, e.g. 120 t/month"
                    value={form.monthlySalesTarget}
                    onChange={(e) => setForm({ ...form, monthlySalesTarget: e.target.value })}
                  />
                  {canEdit && (
                    <div className="md:col-span-2 flex justify-end pt-2">
                      <Button onClick={() => setStep(2)} disabled={!step1Complete}>
                        Next: Market Coverage
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 2 — Market Coverage */}
            {(step === 2 || !canEdit) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand" />
                    Market coverage
                  </CardTitle>
                  <p className="text-sm text-ink-muted">
                    {tender?.routes?.length
                      ? "Select every route from this mandate that your network can actively cover."
                      : "Confirm which regions from this mandate fall within your active coverage."}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {tender?.routes && tender.routes.length > 0 ? (
                    <RouteGrid
                      routes={tender.routes}
                      covered={coveredItems}
                      onToggle={toggleItem}
                      canEdit={canEdit}
                    />
                  ) : (
                    <RegionGrid
                      regions={tender?.regions ?? []}
                      covered={coveredItems}
                      onToggle={toggleItem}
                      canEdit={canEdit}
                    />
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Named account coverage
                    </label>
                    <Input
                      disabled={!canEdit}
                      placeholder="Named forwarders or accounts you will activate for this mandate"
                      value={form.namedAccountCoverage}
                      onChange={(e) => setForm({ ...form, namedAccountCoverage: e.target.value })}
                    />
                  </div>

                  {canEdit && (
                    <div className="flex items-center justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button onClick={() => setStep(3)} disabled={!step2Complete}>
                        Next: Execution Plan
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 3 — Execution Plan */}
            {(step === 3 || !canEdit) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-brand" />
                    Execution plan
                  </CardTitle>
                  <p className="text-sm text-ink-muted">
                    Show the airline exactly how you will activate this mandate — who does what, by when.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Textarea
                      disabled={!canEdit}
                      placeholder={tender ? getNetworkPlanPlaceholder(tender) : "Network plan: named forwarders, verticals, launch pipeline, weekly sales cadence"}
                      value={form.networkPlan}
                      onChange={(e) => setForm({ ...form, networkPlan: e.target.value })}
                      className="min-h-[120px] pr-32 pt-10"
                    />
                    {canEdit && (
                      <AiTextButton
                        value={form.networkPlan}
                        onChange={(value) => setForm({ ...form, networkPlan: value })}
                        fieldLabel="GSA application network plan"
                        context={buildApplicationAiContext(tender, gsa)}
                      />
                    )}
                  </div>
                  <div className="relative">
                    <Textarea
                      disabled={!canEdit}
                      placeholder="Operational readiness: team, launch owners, tools, reporting cadence, first-30-day milestones"
                      value={form.operationalReadiness}
                      onChange={(e) => setForm({ ...form, operationalReadiness: e.target.value })}
                      className="min-h-[120px] pr-32 pt-10"
                    />
                    {canEdit && (
                      <AiTextButton
                        value={form.operationalReadiness}
                        onChange={(value) => setForm({ ...form, operationalReadiness: value })}
                        fieldLabel="GSA application operational readiness"
                        context={buildApplicationAiContext(tender, gsa)}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-ink-muted" />
                      <p className="text-sm font-semibold text-ink">Supporting documents</p>
                    </div>
                    <p className="text-xs text-ink-muted">Profile deck, account list, references, certifications, financials, launch plan</p>
                    {canEdit ? (
                      <FileDropzone files={files} onChange={setFiles} hint="Drag & drop or click to upload" />
                    ) : (
                      <DocumentList documents={files} />
                    )}
                  </div>

                  {error && (
                    <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>
                  )}

                  {canEdit && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(2)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <div className="flex gap-3">
                        <Button asChild variant="outline">
                          <Link href={`/gsa/tenders/${tenderId}`}>Cancel</Link>
                        </Button>
                        <Button
                          disabled={saving || !form.proposedCommission.trim()}
                          onClick={submit}
                        >
                          {saving
                            ? "Saving…"
                            : application
                            ? "Update application"
                            : `Submit${files.length ? ` · ${files.length} doc${files.length > 1 ? "s" : ""}` : ""}`}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Mandate Fit Score Panel ── */}
          <div className="space-y-4">
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Mandate fit score</CardTitle>
                <p className="text-xs text-ink-muted">Updates as you fill in the bid</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <FitScoreArc score={fit.total} />

                <div className="space-y-2">
                  <FitSubScore label="Commercial" value={fit.commercial} max={25} />
                  <FitSubScore label="Coverage" value={fit.coverage} max={25} />
                  <FitSubScore label="Execution" value={fit.execution} max={25} />
                  <FitSubScore label="Documents" value={fit.documents} max={25} />
                </div>

                <div className="border-t border-border-ui pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Auto-attached profile</p>
                  <div
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{ background: `${gsa.color}14` }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                      style={{ background: gsa.color }}
                    >
                      {gsa.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{gsa.name}</p>
                      <p className="text-xs text-ink-muted">
                        Net {gsa.networkScore} · Fin {gsa.financialScore} · Com {gsa.complianceScore}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {gsa.markets.slice(0, 3).map((m) => (
                      <span key={m} className="rounded-md border border-border-ui bg-surface2 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                        {m}
                      </span>
                    ))}
                    {gsa.certifications.slice(0, 2).map((c) => (
                      <span key={c} className="rounded-md border border-[#0B7A52]/25 bg-success-bg px-2 py-0.5 text-[10px] font-medium text-success">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {fit.total < 50 && canEdit && (
                  <div className="rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-xs text-warning">
                    <p className="font-semibold">Strengthen your bid</p>
                    <p className="mt-0.5 opacity-80">
                      {fit.commercial < 20 && "Fill all commercial fields. "}
                      {fit.coverage < 15 && "Select route coverage in step 2. "}
                      {fit.execution < 15 && "Add more detail to your execution plan. "}
                      {fit.documents === 0 && "Attach at least one supporting document."}
                    </p>
                  </div>
                )}

                {fit.total >= 75 && (
                  <div className="rounded-lg border border-[#0B7A52]/25 bg-success-bg px-3 py-2 text-xs text-success">
                    <p className="font-semibold">Strong bid</p>
                    <p className="mt-0.5 opacity-80">This proposal covers all key dimensions the airline evaluates.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {!canEdit && (
              <div className="rounded-xl border border-border-ui bg-surface2 p-4 text-center">
                <Users className="mx-auto mb-2 h-5 w-5 text-ink-muted" />
                <p className="text-sm font-semibold text-ink">Application locked</p>
                <p className="mt-1 text-xs text-ink-muted">The 24-hour edit window is closed.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function FitScoreArc({ score }: { score: number }) {
  const r = 44;
  const cx = 55;
  const cy = 60;
  const circ = 2 * Math.PI * r;
  const active = circ * 0.75;
  const progress = (Math.min(100, score) / 100) * active;
  const color =
    score >= 75
      ? "var(--brand)"
      : score >= 45
      ? "var(--warning)"
      : score > 0
      ? "var(--danger)"
      : "var(--ink-faint)";

  return (
    <svg viewBox="0 0 110 120" className="w-full max-w-[150px] mx-auto">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--surface3)"
        strokeWidth={10}
        strokeDasharray={`${active.toFixed(2)} ${circ.toFixed(2)}`}
        strokeLinecap="round"
        transform={`rotate(135, ${cx}, ${cy})`}
      />
      {progress > 0.5 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${progress.toFixed(2)} ${circ.toFixed(2)}`}
          strokeLinecap="round"
          transform={`rotate(135, ${cx}, ${cy})`}
        />
      )}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize={28}
        fontWeight={800}
        fill="var(--ink)"
        fontFamily="inherit"
      >
        {score}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fontSize={7.5}
        fontWeight={700}
        fill="var(--ink-muted)"
        fontFamily="inherit"
        letterSpacing="0.1em"
      >
        FIT SCORE
      </text>
    </svg>
  );
}

function FitSubScore({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  const color =
    pct >= 75 ? "var(--brand)" : pct >= 40 ? "var(--warning)" : "var(--ink-faint)";
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-ink-muted">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-surface3" style={{ height: "6px" }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-semibold text-ink">
        {value}/{max}
      </span>
    </div>
  );
}

function RouteGrid({
  routes, covered, onToggle, canEdit,
}: {
  routes: TenderRouteFrequency[];
  covered: Set<string>;
  onToggle: (id: string) => void;
  canEdit: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {routes.length} routes in this mandate
        </p>
        {covered.size > 0 && (
          <span className="text-xs font-semibold text-brand">
            {covered.size}/{routes.length} covered
          </span>
        )}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => {
          const isOn = covered.has(route.id);
          return (
            <button
              key={route.id}
              type="button"
              disabled={!canEdit}
              onClick={() => onToggle(route.id)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                isOn
                  ? "border-brand bg-brand-light shadow-sm shadow-brand/10"
                  : "border-border-ui bg-surface hover:border-brand/40"
              } ${!canEdit ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Route</span>
                {isOn && <Check className="h-4 w-4 text-brand" />}
              </div>
              <p className="mt-1.5 text-base font-bold text-ink">
                {route.origin} → {route.destination}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {route.frequencyPerWeek}× / week
                {route.aircraft ? ` · ${route.aircraft}` : ""}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RegionGrid({
  regions, covered, onToggle, canEdit,
}: {
  regions: string[];
  covered: Set<string>;
  onToggle: (id: string) => void;
  canEdit: boolean;
}) {
  if (regions.length === 0) return null;
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Regions in scope for this mandate
      </p>
      <div className="flex flex-wrap gap-2.5">
        {regions.map((region) => {
          const isOn = covered.has(region);
          return (
            <button
              key={region}
              type="button"
              disabled={!canEdit}
              onClick={() => onToggle(region)}
              className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                isOn
                  ? "border-brand bg-brand-light text-brand shadow-sm shadow-brand/10"
                  : "border-border-ui text-ink-muted hover:border-brand/40"
              } ${!canEdit ? "cursor-default" : "cursor-pointer"}`}
            >
              {isOn && <Check className="h-3.5 w-3.5" />}
              {region}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TenderRuleChip({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface2 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1.5 font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ink-muted">{helper}</p>
    </div>
  );
}

function getAwardLabel(tender: LiveTender) {
  if (tender.awardMode === "multi") return `Up to ${Math.max(2, tender.maxAwards ?? 2)} winners`;
  return "Single winner";
}
function getAwardHelper(tender: LiveTender) {
  if (tender.awardMode === "multi") return "More than one GSA can be accepted for this scope.";
  return "Once one GSA is accepted the tender closes.";
}
function getCommercialLabel(tender: LiveTender) {
  const m = tender.commercialModel ?? "commission";
  if (m === "capacity-risk") return "Capacity-risk";
  if (m === "hybrid") return "Hybrid";
  return "Commission bid";
}
function getCommercialHelper(tender: LiveTender) {
  const m = tender.commercialModel ?? "commission";
  if (m === "capacity-risk") return "Show how you will fill capacity at profitable yields.";
  if (m === "hybrid") return "Show base commission and target-based upside.";
  return "Show commission terms and why your sales plan wins.";
}
function getDecisionFocus(tender: LiveTender) {
  const m = tender.commercialModel ?? "commission";
  if (m === "capacity-risk") return "Yield and capacity plan";
  if (m === "hybrid") return "Balanced upside";
  return "Commission and coverage";
}
function getProposalTitle(tender: LiveTender) {
  const m = tender.commercialModel ?? "commission";
  if (m === "capacity-risk") return "Capacity sales proposal";
  if (m === "hybrid") return "Hybrid commercial proposal";
  return "Commission proposal";
}
function getCommercialPlaceholder(tender: LiveTender) {
  const m = tender.commercialModel ?? "commission";
  if (m === "capacity-risk") return "Capacity/yield proposal — e.g. guaranteed block margin or target yield plan";
  if (m === "hybrid") return "Base commission plus volume/yield accelerator";
  return "Proposed commission — e.g. 5% net-net plus target incentive";
}
function getNetworkPlanPlaceholder(tender: LiveTender) {
  const m = tender.commercialModel ?? "commission";
  if (m === "capacity-risk") return "Capacity plan: key accounts, yield protection, peak handling, unsold capacity risk controls";
  if (m === "hybrid") return "Growth plan: accounts, volume targets, upside triggers, reporting cadence";
  return "Network plan: named forwarders, verticals, launch pipeline, weekly sales cadence";
}

function buildApplicationAiContext(tender: LiveTender | null, gsa: RealGsaPartner) {
  return [
    tender?.title ? `Tender: ${tender.title}` : "",
    tender?.countryScope ? `Market: ${tender.countryScope}` : "",
    tender?.productMix ? `Cargo focus: ${tender.productMix}` : "",
    gsa.name ? `GSA: ${gsa.name}` : "",
    gsa.coverage.length ? `GSA coverage: ${gsa.coverage.join(", ")}` : "",
    gsa.cargoFocus ? `GSA cargo focus: ${gsa.cargoFocus}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}
