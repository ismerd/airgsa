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
import { Select } from "@/components/ui/select";
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
          setCoveredItems(new Set([...existing.markets, ...existing.coverage]));
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

    const activationItems = splitOptionValue(form.networkPlan);
    const readiness = parseReadinessValue(form.operationalReadiness);
    let execution = 0;
    if (activationItems.length >= 3) execution += 15;
    else if (activationItems.length > 0) execution += 8;
    if (readiness.items.length >= 3 || readiness.note.length > 40) execution += 10;
    else if (readiness.items.length > 0 || readiness.note.length > 0) execution += 5;
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
      const selectedCoverage = Array.from(coveredItems);
      const isRouteScope = Boolean(tender?.routes?.length);
      const res = await fetch(`/api/tenders/${tenderId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          documents: files,
          coverage: selectedCoverage,
          markets: isRouteScope ? [] : selectedCoverage,
        }),
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
  const accountCoverage = parseAccountCoverageValue(form.namedAccountCoverage);
  const step2Complete = coveredItems.size > 0 || accountCoverage.items.length > 0 || accountCoverage.note.length > 0;
  const activationPlan = splitOptionValue(form.networkPlan);
  const readinessPlan = parseReadinessValue(form.operationalReadiness);
  const commercialInput = getCommercialInputConfig(tender);

  function updateActivationPlan(values: string[]) {
    setForm((current) => ({ ...current, networkPlan: formatOptionValue(values) }));
  }

  function updateReadinessPlan(values: string[]) {
    setForm((current) => ({
      ...current,
      operationalReadiness: formatReadinessValue(values, parseReadinessValue(current.operationalReadiness).note),
    }));
  }

  function updateReadinessNote(note: string) {
    setForm((current) => ({
      ...current,
      operationalReadiness: formatReadinessValue(parseReadinessValue(current.operationalReadiness).items, note),
    }));
  }

  function updateAccountCoverageOptions(values: string[]) {
    setForm((current) => ({
      ...current,
      namedAccountCoverage: formatAccountCoverageValue(values, parseAccountCoverageValue(current.namedAccountCoverage).note),
    }));
  }

  function updateAccountCoverageNote(note: string) {
    setForm((current) => ({
      ...current,
      namedAccountCoverage: formatAccountCoverageValue(parseAccountCoverageValue(current.namedAccountCoverage).items, note),
    }));
  }

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
                    { n: 1 as const, label: "Price and launch", Icon: DollarSign },
                    { n: 2 as const, label: "Coverage", Icon: MapPin },
                    { n: 3 as const, label: "Proof", Icon: Rocket },
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
                    Price and launch
                  </CardTitle>
                  <p className="text-sm text-ink-muted">
                    {canEdit
                      ? "Fill the few values the airline actually compares. Your company profile is attached automatically."
                      : "The 24-hour edit window has closed. This application is read-only."}
                  </p>
                </CardHeader>

                {tender && <TenderDecisionSummary tender={tender} />}

                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{commercialInput.label}</p>
                    <Input
                      disabled={!canEdit}
                      type="number"
                      step="0.1"
                      min="0"
                      max={commercialInput.max}
                      placeholder={commercialInput.placeholder}
                      value={form.proposedCommission}
                      onChange={(e) => setForm({ ...form, proposedCommission: e.target.value })}
                    />
                    {canEdit && <p className="text-xs leading-5 text-ink-muted">{commercialInput.helper}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Launch readiness after award</p>
                    <Select
                      disabled={!canEdit}
                      value={form.launchTimeline}
                      onChange={(e) => setForm({ ...form, launchTimeline: e.target.value })}
                    >
                      <option value="">Select launch timeline</option>
                      <option value="2 weeks from award">2 weeks from award</option>
                      <option value="4 weeks from award">4 weeks from award</option>
                      <option value="6 weeks from award">6 weeks from award</option>
                      <option value="8 weeks from award">8 weeks from award</option>
                      <option value="12 weeks from award">12 weeks from award</option>
                    </Select>
                    <p className="text-xs leading-5 text-ink-muted">{getLaunchTimelineHelper(tender)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Monthly tonnage you can deliver</p>
                    <Input
                      disabled={!canEdit}
                      type="number"
                      min="0"
                      placeholder="Example: 1500"
                      value={form.monthlySalesTarget}
                      onChange={(e) => setForm({ ...form, monthlySalesTarget: e.target.value })}
                    />
                    <p className="text-xs leading-5 text-ink-muted">
                      Enter tons per month. The airline target is {getTenderMonthlyTonnage(tender) || "shown in the tender summary"}.
                    </p>
                  </div>
                  {canEdit && (
                    <div className="md:col-span-2 flex justify-end pt-2">
                      <Button onClick={() => setStep(2)} disabled={!step1Complete}>
                        Next: Coverage
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
                      : tender?.coverageModel === "airport-led"
                        ? "Confirm which key airports or cities from this mandate your team can cover."
                        : "Confirm which market scope from this mandate falls within your active coverage."}
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

                  <ExecutionOptionGrid
                    title="Account coverage approach"
                    helper="Select how you will build demand. You do not need to disclose private customer names unless you choose to."
                    options={getAccountCoverageOptions(tender)}
                    value={accountCoverage.items}
                    onChange={updateAccountCoverageOptions}
                    canEdit={canEdit}
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Optional named accounts or sectors
                    </label>
                    <Input
                      disabled={!canEdit}
                      placeholder="Optional: key forwarders, verticals, or target sectors"
                      value={accountCoverage.note}
                      onChange={(e) => updateAccountCoverageNote(e.target.value)}
                    />
                    <p className="text-xs leading-5 text-ink-muted">
                      Keep this short. Use sectors if you do not want to name customers in the first bid.
                    </p>
                  </div>

                  {canEdit && (
                    <div className="flex items-center justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep(1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button onClick={() => setStep(3)} disabled={!step2Complete}>
                        Next: Proof
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
                    Select concrete proof points and attach documents. One short note is enough if something is special.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ExecutionOptionGrid
                    title="Sales activation plan"
                    helper="Select the actions you will execute after award. This is easier for airlines to compare than a long paragraph."
                    options={getActivationOptions(tender)}
                    value={activationPlan}
                    onChange={updateActivationPlan}
                    canEdit={canEdit}
                  />
                  <ExecutionOptionGrid
                    title="Launch readiness proof"
                    helper="Select the proof points you can back up with process, team, or documents."
                    options={readinessOptions}
                    value={readinessPlan.items}
                    onChange={updateReadinessPlan}
                    canEdit={canEdit}
                  />
                  <div className="relative space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Additional execution note</p>
                    <Textarea
                      disabled={!canEdit}
                      placeholder="Optional: add mandate-specific context that the selections above do not cover."
                      value={readinessPlan.note}
                      onChange={(e) => updateReadinessNote(e.target.value)}
                      className="min-h-[90px] pr-32"
                    />
                    {canEdit && (
                      <AiTextButton
                        value={readinessPlan.note}
                        onChange={updateReadinessNote}
                        fieldLabel="GSA application execution note"
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
                <CardTitle className="text-sm">Bid readiness</CardTitle>
                <p className="text-xs text-ink-muted">Shows what is still missing before you submit</p>
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
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Attached automatically</p>
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

type ExecutionOption = {
  value: string;
  label: string;
  helper: string;
};

const readinessOptions: ExecutionOption[] = [
  {
    value: "Dedicated launch owner",
    label: "Launch owner",
    helper: "Named person accountable for the first activation phase.",
  },
  {
    value: "Weekly pipeline review",
    label: "Pipeline review",
    helper: "Structured cadence for opportunities, quotes, wins, and blockers.",
  },
  {
    value: "First 30 day milestone plan",
    label: "30-day milestones",
    helper: "Early actions and measurable launch checkpoints.",
  },
  {
    value: "Operations escalation path",
    label: "Escalation path",
    helper: "Clear process for service failures, claims, and urgent requests.",
  },
  {
    value: "Documented sales reporting",
    label: "Sales reporting",
    helper: "Repeatable reports for revenue, tonnage, pipeline, and lost business.",
  },
  {
    value: "Relevant certificates available",
    label: "Certificates ready",
    helper: "Compliance documents can be attached or produced quickly.",
  },
];

function ExecutionOptionGrid({
  title,
  helper,
  options,
  value,
  onChange,
  canEdit,
}: {
  title: string;
  helper: string;
  options: ExecutionOption[];
  value: string[];
  onChange: (value: string[]) => void;
  canEdit: boolean;
}) {
  const selected = new Set(value.map((item) => item.toLowerCase()));

  function toggle(option: ExecutionOption) {
    if (!canEdit) return;
    if (selected.has(option.value.toLowerCase())) {
      onChange(value.filter((item) => item.toLowerCase() !== option.value.toLowerCase()));
      return;
    }
    onChange([...value, option.value]);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">{helper}</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => {
          const isActive = selected.has(option.value.toLowerCase());
          return (
            <button
              key={option.value}
              type="button"
              disabled={!canEdit}
              onClick={() => toggle(option)}
              className={`min-h-[92px] rounded-xl border p-3 text-left transition ${
                isActive
                  ? "border-brand bg-brand-light text-brand"
                  : "border-border-ui bg-surface2 text-ink hover:border-brand/40 hover:bg-brand-light"
              } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className="flex items-start gap-2">
                <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-brand text-white" : "bg-surface text-brand"}`}>
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span>
                  <span className={`block text-sm font-semibold ${isActive ? "text-brand" : "text-ink"}`}>{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-ink-muted">{option.helper}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TenderDecisionSummary({ tender }: { tender: LiveTender }) {
  const monthlyTonnage = getTenderMonthlyTonnage(tender);
  const items = [
    { label: "Mandate", value: getMandateLabel(tender) },
    { label: "Scope", value: getCoverageLabel(tender) },
    { label: "Award", value: getAwardLabel(tender) },
    { label: "Commercial", value: getCommercialLabel(tender) },
    { label: "Target", value: monthlyTonnage || "Not set" },
  ];

  return (
    <div className="mx-6 mb-4 rounded-2xl border border-brand/15 bg-brand-light/50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">What the airline will compare</p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">{getApplicationDecisionHint(tender)}</p>
        </div>
        <span className="w-fit rounded-full border border-brand/20 bg-surface px-3 py-1 text-xs font-semibold text-brand">
          {getDecisionFocus(tender)}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-border-ui bg-surface px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{item.label}</p>
            <p className="mt-1 text-sm font-bold text-ink">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getAwardLabel(tender: LiveTender) {
  if (tender.awardMode === "multi") return `Up to ${Math.max(2, tender.maxAwards ?? 2)} winners`;
  return "Single winner";
}
function getCommercialLabel(tender: LiveTender) {
  const m = tender.commercialModel ?? "commission";
  if (m === "capacity-risk") return "Capacity-risk";
  if (m === "hybrid") return "Hybrid";
  return "Commission bid";
}
function getMandateLabel(tender: LiveTender) {
  if (tender.mandateType === "sales-only") return "Sales-only";
  if (tender.mandateType === "route-launch") return "Route launch";
  if (tender.mandateType === "product-specialist") return "Product specialist";
  if (tender.mandateType === "regional-cluster") return "Regional cluster";
  return "Full GSA";
}
function getCoverageLabel(tender: LiveTender) {
  if (tender.coverageModel === "airport-led") return "Airport-led";
  if (tender.coverageModel === "route-led") return "Route-led";
  if (tender.coverageModel === "regional-cluster") return "Regional cluster";
  return "Country-wide";
}
function getDecisionFocus(tender: LiveTender) {
  const m = tender.commercialModel ?? "commission";
  if (tender.coverageModel === "route-led") return "Route activation";
  if (tender.coverageModel === "airport-led") return "Airport coverage";
  if (m === "capacity-risk") return "Yield and capacity plan";
  if (m === "hybrid") return "Balanced upside";
  return "Commission and coverage";
}
function getApplicationDecisionHint(tender: LiveTender) {
  const m = tender.commercialModel ?? "commission";
  if (tender.coverageModel === "route-led") {
    return "Select the lanes you can cover, commit a realistic launch timeline, and prove how you will activate route demand.";
  }
  if (tender.coverageModel === "airport-led") {
    return "Show station coverage, launch readiness, and a simple commercial offer for the selected airport scope.";
  }
  if (m === "capacity-risk") {
    return "The airline is checking whether you can fill capacity at acceptable yield, not only whether your commission is low.";
  }
  if (m === "hybrid") {
    return "Keep the base commission clear, then prove how you will create upside through volume, yield, or target accounts.";
  }
  return "Keep the commission clear, select the market you can cover, and attach proof that your sales plan is ready.";
}
function getTenderMonthlyTonnage(tender: LiveTender | null) {
  if (!tender?.annualTonnage) return "";
  return `${Math.round(tender.annualTonnage / 12).toLocaleString()} tons/month`;
}
function getCommercialInputConfig(tender: LiveTender | null) {
  const m = tender?.commercialModel ?? "commission";
  if (m === "capacity-risk") {
    return {
      label: "Monthly revenue commitment (contract currency)",
      placeholder: "Example: 250000",
      helper: "Use a money amount, not tons. Tonnage is entered in the field below.",
      max: undefined,
    };
  }
  if (m === "hybrid") {
    return {
      label: "Base commission (%)",
      placeholder: "Example: 4",
      helper: "Enter the base commission. Upside is evaluated through the selected execution and performance proof.",
      max: 100,
    };
  }
  return {
    label: "Proposed commission (%)",
    placeholder: "Example: 5",
    helper: "Enter the net commission percentage you are proposing for this mandate.",
    max: 100,
  };
}
function getLaunchTimelineHelper(tender: LiveTender | null) {
  const targetStart = tender?.expectedStart ? formatTenderDate(tender.expectedStart) : null;
  if (targetStart) {
    return `Measured from award date. Airline target contract start: ${targetStart}.`;
  }
  return "Measured from award date. The airline uses this to compare how quickly each GSA can launch after award.";
}

function getActivationOptions(tender: LiveTender | null): ExecutionOption[] {
  const routeLed = tender?.coverageModel === "route-led";
  const airportLed = tender?.coverageModel === "airport-led";
  const capacityRisk = tender?.commercialModel === "capacity-risk";
  const hybrid = tender?.commercialModel === "hybrid";

  return [
    {
      value: routeLed ? "Route account activation" : "Target account activation",
      label: routeLed ? "Route accounts" : "Target accounts",
      helper: routeLed
        ? "Identify accounts that can move cargo on the mandate lanes."
        : "Activate relevant forwarder and shipper segments without forcing customer-name disclosure.",
    },
    {
      value: airportLed ? "Station coverage plan" : "Market coverage plan",
      label: airportLed ? "Station coverage" : "Market coverage",
      helper: airportLed
        ? "Show local airport presence and station ownership."
        : "Show how the selected country or region will be covered.",
    },
    {
      value: capacityRisk ? "Yield protection plan" : "Volume ramp-up plan",
      label: capacityRisk ? "Yield protection" : "Volume ramp-up",
      helper: capacityRisk
        ? "Explain how capacity will be sold without undercutting yield."
        : "Define how volume should build after launch.",
    },
    {
      value: hybrid ? "Upside trigger tracking" : "Quote conversion tracking",
      label: hybrid ? "Upside tracking" : "Quote conversion",
      helper: hybrid
        ? "Track triggers for target-based upside."
        : "Track quotes, conversion rate, lost reasons, and next actions.",
    },
    {
      value: "Product vertical focus",
      label: "Product verticals",
      helper: "Focus on the cargo types requested in the tender.",
    },
    {
      value: "Monthly performance review",
      label: "Performance review",
      helper: "Commit to a clear review rhythm for sales and operational performance.",
    },
  ];
}

function getAccountCoverageOptions(tender: LiveTender | null): ExecutionOption[] {
  const routeLed = tender?.coverageModel === "route-led";
  const airportLed = tender?.coverageModel === "airport-led";
  const productSpecialist = tender?.mandateType === "product-specialist";

  return [
    {
      value: routeLed ? "Lane-specific forwarder targeting" : "Top account target list",
      label: routeLed ? "Lane accounts" : "Top accounts",
      helper: routeLed
        ? "Target accounts with cargo on the selected lanes."
        : "Maintain a clear target list without exposing every customer name.",
    },
    {
      value: airportLed ? "Airport catchment sales coverage" : "Local market sales coverage",
      label: airportLed ? "Airport catchment" : "Local market",
      helper: airportLed
        ? "Cover forwarders and shippers around the selected station."
        : "Cover the relevant local cargo market segments.",
    },
    {
      value: productSpecialist ? "Product vertical account coverage" : "Vertical segment targeting",
      label: productSpecialist ? "Product verticals" : "Verticals",
      helper: "Target accounts by cargo segment such as pharma, automotive, e-commerce, or perishables.",
    },
    {
      value: "Named owner per priority account",
      label: "Account owners",
      helper: "Assign a responsible sales owner for priority accounts.",
    },
    {
      value: "Visit and quote cadence",
      label: "Visit cadence",
      helper: "Define contact rhythm, quote follow-up, and lost-business review.",
    },
    {
      value: "Pipeline review with airline",
      label: "Pipeline review",
      helper: "Share pipeline, quotes, wins, blockers, and next actions with the airline.",
    },
  ];
}

function splitOptionValue(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !/^note:/i.test(item));
}

function formatOptionValue(values: string[]) {
  return values.join(", ");
}

function parseAccountCoverageValue(value: string) {
  const parts = value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const notePart = parts.find((item) => /^note:/i.test(item));
  return {
    items: parts.filter((item) => !/^note:/i.test(item)),
    note: notePart ? notePart.replace(/^note:\s*/i, "") : "",
  };
}

function formatAccountCoverageValue(items: string[], note: string) {
  return [...items, note.trim() ? `Note: ${note.trim()}` : ""].filter(Boolean).join(", ");
}

function parseReadinessValue(value: string) {
  const parts = value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const notePart = parts.find((item) => /^note:/i.test(item));
  return {
    items: parts.filter((item) => !/^note:/i.test(item)),
    note: notePart ? notePart.replace(/^note:\s*/i, "") : "",
  };
}

function formatReadinessValue(items: string[], note: string) {
  return [...items, note.trim() ? `Note: ${note.trim()}` : ""].filter(Boolean).join(", ");
}

function formatTenderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function buildApplicationAiContext(tender: LiveTender | null, gsa: RealGsaPartner) {
  return [
    tender?.title ? `Tender: ${tender.title}` : "",
    tender?.countryScope ? `Market: ${tender.countryScope}` : "",
    tender?.productMix ? `Cargo focus: ${tender.productMix}` : "",
    tender?.mandateType ? `Mandate type: ${getMandateLabel(tender)}` : "",
    tender?.coverageModel ? `Coverage model: ${getCoverageLabel(tender)}` : "",
    tender?.requiredCapabilities?.length ? `Required capabilities: ${tender.requiredCapabilities.join(", ")}` : "",
    gsa.name ? `GSA: ${gsa.name}` : "",
    gsa.coverage.length ? `GSA coverage: ${gsa.coverage.join(", ")}` : "",
    gsa.cargoFocus ? `GSA cargo focus: ${gsa.cargoFocus}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}
