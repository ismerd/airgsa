"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Edit3, MapPin, PlaneTakeoff, Plus, Trash2 } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LiveTender, LiveTenderApplication, TenderRouteFrequency } from "@/lib/services/tender-workflow-store";

type TenderFormState = {
  title: string;
  countryScope: string;
  annualTonnage: string;
  productMix: string;
  deadline: string;
  expectedStart: string;
  status: "draft" | "open" | "closed";
  awardMode: "single" | "multi";
  maxAwards: string;
  commercialModel: "commission" | "capacity-risk" | "hybrid";
  requirements: string;
  commercialExpectations: string;
  routes: Array<Omit<TenderRouteFrequency, "id">>;
};

const emptyRoute: Omit<TenderRouteFrequency, "id"> = {
  origin: "",
  destination: "",
  operatingDays: "",
  frequencyPerWeek: 1,
  aircraft: "",
};

export default function AirlineTendersPage() {
  const [tenders, setTenders] = useState<LiveTender[]>([]);
  const [applications, setApplications] = useState<LiveTenderApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTender, setEditingTender] = useState<LiveTender | null>(null);
  const [form, setForm] = useState<TenderFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTenders();
  }, []);

  const applicationStatsByTender = useMemo(() => {
    const map = new Map<string, TenderApplicationStats>();
    for (const tender of tenders) {
      const rows = applications.filter((application) => application.tenderId === tender.id);
      const awardSlots = getAwardSlots(tender);
      const accepted = rows.filter((application) => application.status === "accepted").length;
      const pending = rows.filter((application) => application.status === "pending").length;
      const shortlisted = rows.filter((application) => application.status === "shortlisted").length;
      map.set(tender.id, {
        total: rows.length,
        pending,
        shortlisted,
        accepted,
        rejected: rows.filter((application) => application.status === "rejected").length,
        awardSlots,
        lifecycle: getTenderLifecycle(tender, accepted, awardSlots, rows.length, shortlisted),
      });
    }
    return map;
  }, [applications, tenders]);
  const liveTenders = useMemo(
    () => tenders.filter((tender) => applicationStatsByTender.get(tender.id)?.lifecycle.key === "live").length,
    [applicationStatsByTender, tenders],
  );
  const evaluationTenders = useMemo(
    () => tenders.filter((tender) => ["evaluating", "part-awarded"].includes(applicationStatsByTender.get(tender.id)?.lifecycle.key ?? "")).length,
    [applicationStatsByTender, tenders],
  );
  const awardedTenders = useMemo(
    () => tenders.filter((tender) => applicationStatsByTender.get(tender.id)?.lifecycle.key === "awarded").length,
    [applicationStatsByTender, tenders],
  );

  async function loadTenders() {
    setLoading(true);
    Promise.all([
      fetch("/api/tenders").then((res) => (res.ok ? res.json() : { tenders: [] })),
      fetch("/api/applications").then((res) => (res.ok ? res.json() : { applications: [] })),
    ])
      .then(([tenderData, applicationData]) => {
        setTenders(tenderData.tenders ?? []);
        setApplications(applicationData.applications ?? []);
      })
      .catch(() => {
        setTenders([]);
        setApplications([]);
      })
      .finally(() => setLoading(false));
  }

  function startEdit(tender: LiveTender) {
    setEditingTender(tender);
    setForm({
      title: tender.title,
      countryScope: tender.countryScope,
      annualTonnage: String(tender.annualTonnage || ""),
      productMix: tender.productMix,
      deadline: tender.deadline,
      expectedStart: tender.expectedStart,
      status: tender.status,
      awardMode: tender.awardMode ?? "single",
      maxAwards: String(tender.maxAwards ?? 1),
      commercialModel: tender.commercialModel ?? "commission",
      requirements: tender.requirements.join("\n"),
      commercialExpectations: tender.commercialExpectations,
      routes: tender.routes.length
        ? tender.routes.map(({ origin, destination, operatingDays, frequencyPerWeek, aircraft }) => ({
            origin,
            destination,
            operatingDays: operatingDays ?? "",
            frequencyPerWeek,
            aircraft: aircraft ?? "",
          }))
        : [{ ...emptyRoute }],
    });
    setError(null);
  }

  async function saveEdit() {
    if (!editingTender || !form) return;
    setSaving(true);
    setError(null);

    const activeRoutes = form.routes
      .filter((route) => route.origin.trim() && route.destination.trim())
      .map((route, index) => ({
        ...route,
        id: `route-${index + 1}`,
        origin: route.origin.trim().toUpperCase(),
        destination: route.destination.trim().toUpperCase(),
        frequencyPerWeek: Number(route.frequencyPerWeek) || 1,
      }));
    const regions = form.countryScope.split(",").map((item) => item.trim()).filter(Boolean);

    try {
      const res = await fetch(`/api/tenders/${editingTender.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          countryScope: form.countryScope.trim(),
          regions,
          lanes: activeRoutes.length
            ? activeRoutes.map((route) => `${route.origin}-${route.destination}`).join(", ")
            : form.countryScope.trim(),
          annualTonnage: Number(form.annualTonnage) || 0,
          productMix: form.productMix.trim(),
          deadline: form.deadline,
          expectedStart: form.expectedStart,
          status: form.status,
          awardMode: form.awardMode,
          maxAwards: Number(form.maxAwards) || 1,
          commercialModel: form.commercialModel,
          requirements: form.requirements.split("\n").map((item) => item.trim()).filter(Boolean),
          commercialExpectations: form.commercialExpectations.trim(),
          routes: activeRoutes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Tender could not be updated");
        return;
      }

      const data = await res.json();
      setTenders((current) => current.map((tender) => (tender.id === editingTender.id ? data.tender : tender)));
      setEditingTender(null);
      setForm(null);
    } catch {
      setError("Tender could not be updated. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTender(tender: LiveTender) {
    const confirmed = window.confirm(`Delete tender "${tender.title}"? Existing applications for this tender will also be removed.`);
    if (!confirmed) return;

    setDeletingId(tender.id);
    try {
      const res = await fetch(`/api/tenders/${tender.id}`, { method: "DELETE" });
      if (!res.ok) return;
      setTenders((current) => current.filter((item) => item.id !== tender.id));
      setApplications((current) => current.filter((application) => application.tenderId !== tender.id));
      if (editingTender?.id === tender.id) {
        setEditingTender(null);
        setForm(null);
      }
    } catch {
      setError("Tender could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Topbar title="Tender overview" subtitle="Airline tender desk" />
      <main className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total tenders" value={String(tenders.length)} />
            <Metric label="Live" value={String(liveTenders)} />
            <Metric label="In decision" value={String(evaluationTenders)} />
            <Metric label="Awarded" value={String(awardedTenders)} />
          </div>
          <Link href="/airline/tenders/create" className={buttonVariants()}>
            Create tender
          </Link>
        </div>

        {editingTender && form && (
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Edit tender</CardTitle>
                <p className="text-sm text-ink-muted">{editingTender.id}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditingTender(null); setForm(null); }}>
                  Cancel
                </Button>
                <Button disabled={saving || !form.title.trim()} onClick={saveEdit}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tender title">
                  <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value as TenderFormState["status"] })}
                    className="h-10 w-full rounded-lg border border-border-ui bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </Field>
                <Field label="Country / market scope">
                  <Input value={form.countryScope} onChange={(event) => setForm({ ...form, countryScope: event.target.value })} />
                </Field>
                <Field label="Expected annual tonnage">
                  <Input value={form.annualTonnage} onChange={(event) => setForm({ ...form, annualTonnage: event.target.value })} type="number" />
                </Field>
                <Field label="Product focus">
                  <Input value={form.productMix} onChange={(event) => setForm({ ...form, productMix: event.target.value })} />
                </Field>
                <Field label="Expected start">
                  <Input value={form.expectedStart} onChange={(event) => setForm({ ...form, expectedStart: event.target.value })} type="date" />
                </Field>
                <Field label="Application deadline">
                  <Input value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} type="date" />
                </Field>
                <Field label="Award model">
                  <select
                    value={form.awardMode}
                    onChange={(event) => setForm({
                      ...form,
                      awardMode: event.target.value as TenderFormState["awardMode"],
                      maxAwards: event.target.value === "single" ? "1" : form.maxAwards,
                    })}
                    className="h-10 w-full rounded-lg border border-border-ui bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
                  >
                    <option value="single">Single winner</option>
                    <option value="multi">Multiple GSAs</option>
                  </select>
                </Field>
                <Field label="Award slots">
                  <Input
                    value={form.maxAwards}
                    onChange={(event) => setForm({ ...form, maxAwards: event.target.value })}
                    type="number"
                    min={1}
                    max={10}
                    disabled={form.awardMode === "single"}
                  />
                </Field>
                <Field label="Commercial model" className="md:col-span-2">
                  <select
                    value={form.commercialModel}
                    onChange={(event) => setForm({ ...form, commercialModel: event.target.value as TenderFormState["commercialModel"] })}
                    className="h-10 w-full rounded-lg border border-border-ui bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
                  >
                    <option value="commission">Commission bid - airline controls rate, GSA earns commission</option>
                    <option value="capacity-risk">Capacity risk - GSA sells allocated capacity profitably</option>
                    <option value="hybrid">Hybrid - fixed commission with volume or yield accelerator</option>
                  </select>
                </Field>
                <Field label="Requirements" className="md:col-span-2">
                  <Textarea value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} />
                </Field>
                <Field label="Commercial expectations" className="md:col-span-2">
                  <Textarea value={form.commercialExpectations} onChange={(event) => setForm({ ...form, commercialExpectations: event.target.value })} />
                </Field>
              </div>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Route scope</p>
                    <p className="text-xs text-ink-muted">Leave empty for country-only tenders.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, routes: [...form.routes, { ...emptyRoute }] })}>
                    <Plus className="h-4 w-4" />
                    Add route
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.routes.map((route, index) => (
                    <div key={index} className="grid gap-2 rounded-lg border border-border-ui bg-surface2 p-3 md:grid-cols-[1fr_1fr_150px_1fr_1fr_auto]">
                      <Input value={route.origin} onChange={(event) => updateRoute(index, { origin: event.target.value })} placeholder="Origin" />
                      <Input value={route.destination} onChange={(event) => updateRoute(index, { destination: event.target.value })} placeholder="Destination" />
                      <Input value={route.frequencyPerWeek || ""} onChange={(event) => updateRoute(index, { frequencyPerWeek: Number(event.target.value) })} type="number" min={1} max={14} placeholder="Flights / week" />
                      <Input value={route.operatingDays ?? ""} onChange={(event) => updateRoute(index, { operatingDays: event.target.value })} placeholder="Days if known" />
                      <Input value={route.aircraft ?? ""} onChange={(event) => updateRoute(index, { aircraft: event.target.value })} placeholder="Aircraft / notes" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, routes: form.routes.filter((_, itemIndex) => itemIndex !== index) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-8 text-sm text-ink-muted">Loading tenders...</CardContent>
          </Card>
        ) : tenders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <PlaneTakeoff className="h-10 w-10 text-ink-muted/40" />
              <div>
                <p className="text-lg font-semibold text-ink">No tenders published yet</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Create the first Saudia Cargo GSA tender. It will appear in the GSA marketplace immediately when published.
                </p>
              </div>
              <Button asChild>
                <Link href="/airline/tenders/create">Create tender</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {tenders.map((tender) => (
              <TenderManagementCard
                key={tender.id}
                tender={tender}
                stats={applicationStatsByTender.get(tender.id) ?? createEmptyStats(tender)}
                deleting={deletingId === tender.id}
                onEdit={() => startEdit(tender)}
                onDelete={() => deleteTender(tender)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );

  function updateRoute(index: number, patch: Partial<Omit<TenderRouteFrequency, "id">>) {
    if (!form) return;
    setForm({
      ...form,
      routes: form.routes.map((route, itemIndex) => (itemIndex === index ? { ...route, ...patch } : route)),
    });
  }
}

function TenderManagementCard({
  tender,
  stats,
  deleting,
  onEdit,
  onDelete,
}: {
  tender: LiveTender;
  stats: TenderApplicationStats;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{tender.title}</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">{tender.airline}</p>
          </div>
          <Badge variant={stats.lifecycle.variant}>{stats.lifecycle.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2.5 text-sm text-ink-muted">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand" />
            {tender.regions.join(", ") || tender.countryScope || "No market scope"}
          </span>
          <span className="flex items-center gap-2">
            <PlaneTakeoff className="h-4 w-4 text-brand" />
            {tender.lanes || "Country-only tender"}
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand" />
            Deadline {tender.deadline || "-"}
          </span>
        </div>
        <div className="rounded-xl border border-border-ui bg-surface2 p-3 text-sm text-ink-muted">
          <span className="font-semibold text-ink">{tender.annualTonnage.toLocaleString()} tons</span> expected annually,
          focused on {tender.productMix ? tender.productMix.toLowerCase() : "not specified"}.
        </div>
        <div className="grid gap-2 rounded-xl border border-border-ui bg-surface2 p-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">{getAwardModelLabel(tender, stats.awardSlots)}</Badge>
            <Badge variant="muted">{getCommercialModelLabel(tender)}</Badge>
          </div>
          <p className="text-sm leading-5 text-ink-muted">{getCommercialModelDescription(tender)}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MiniProcessMetric label="Apps" value={stats.total} />
          <MiniProcessMetric label="Pending" value={stats.pending} />
          <MiniProcessMetric label="Shortlist" value={stats.shortlisted} />
          <MiniProcessMetric label="Awarded" value={`${stats.accepted}/${stats.awardSlots}`} />
        </div>
        <div className="rounded-xl border border-brand/15 bg-brand-light/60 p-3 text-sm">
          <p className="font-semibold text-ink">Next step</p>
          <p className="mt-1 leading-5 text-ink-muted">{stats.lifecycle.nextStep}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href={`/airline/applications?tender=${encodeURIComponent(tender.id)}`}>
              {stats.total ? "Open decision room" : "Review tender process"}
            </Link>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onEdit}>
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

type TenderLifecycleKey = "draft" | "live" | "evaluating" | "part-awarded" | "awarded" | "closed";

type TenderLifecycle = {
  key: TenderLifecycleKey;
  label: string;
  variant: "default" | "success" | "warning" | "danger" | "muted";
  nextStep: string;
};

type TenderApplicationStats = {
  total: number;
  pending: number;
  shortlisted: number;
  accepted: number;
  rejected: number;
  awardSlots: number;
  lifecycle: TenderLifecycle;
};

function createEmptyStats(tender: LiveTender): TenderApplicationStats {
  const awardSlots = getAwardSlots(tender);
  return {
    total: 0,
    pending: 0,
    shortlisted: 0,
    accepted: 0,
    rejected: 0,
    awardSlots,
    lifecycle: getTenderLifecycle(tender, 0, awardSlots, 0, 0),
  };
}

function getAwardSlots(tender: LiveTender) {
  if (tender.awardMode === "multi") return Math.max(2, tender.maxAwards ?? 2);
  return Math.max(1, tender.maxAwards ?? 1);
}

function getTenderLifecycle(
  tender: LiveTender,
  acceptedCount: number,
  awardSlots: number,
  applicationCount: number,
  shortlistCount: number,
): TenderLifecycle {
  if (tender.status === "draft") {
    return {
      key: "draft",
      label: "Design draft",
      variant: "muted",
      nextStep: "Finish the mandate scope, commercial rules, and publication timing before GSAs can apply.",
    };
  }

  if (acceptedCount >= awardSlots) {
    return {
      key: "awarded",
      label: "Awarded",
      variant: "success",
      nextStep: "Tender is awarded. The accepted GSA should move into partner profiles and operational handover.",
    };
  }

  if (acceptedCount > 0) {
    return {
      key: "part-awarded",
      label: "Part-awarded",
      variant: "warning",
      nextStep: `Award ${awardSlots - acceptedCount} remaining slot${awardSlots - acceptedCount === 1 ? "" : "s"} or close the tender when the mandate is complete.`,
    };
  }

  if (tender.status === "closed") {
    return {
      key: "closed",
      label: "Closed",
      variant: "muted",
      nextStep: "This tender is closed without an active award. Reopen only if Saudia wants to restart the process.",
    };
  }

  if (tender.status === "open" && applicationCount === 0) {
    return {
      key: "live",
      label: "Live",
      variant: "default",
      nextStep: "Wait for GSA submissions, then shortlist the strongest candidates before accepting an award.",
    };
  }

  if (tender.status === "open" && applicationCount > 0) {
    return {
      key: "evaluating",
      label: shortlistCount > 0 ? "Shortlisting" : "Evaluating",
      variant: "warning",
      nextStep: shortlistCount > 0
        ? "Review the shortlist, inspect documents, and accept the strongest GSA when the mandate is ready."
        : "Compare submissions by coverage, commercial model, readiness, and documents before building a shortlist.",
    };
  }

  return {
    key: "closed",
    label: "Closed",
    variant: "muted",
    nextStep: "This tender is not active. Use edit if the status or award model needs to change.",
  };
}

function getAwardModelLabel(tender: LiveTender, awardSlots: number) {
  if (tender.awardMode === "multi") return `${awardSlots} GSA awards`;
  return "Single GSA award";
}

function getCommercialModelLabel(tender: LiveTender) {
  const model = tender.commercialModel ?? "commission";
  if (model === "capacity-risk") return "Capacity-risk mandate";
  if (model === "hybrid") return "Hybrid commercial model";
  return "Commission bid";
}

function getCommercialModelDescription(tender: LiveTender) {
  const model = tender.commercialModel ?? "commission";
  if (model === "capacity-risk") return "Airline allocates sellable capacity; GSA must prove it can fill it profitably.";
  if (model === "hybrid") return "GSA proposes a base commission plus upside tied to volume, yield, or target over-performance.";
  return "GSA competes on commission, account access, launch plan, and expected sales performance.";
}

function MiniProcessMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface px-2 py-2 text-center">
      <p className="text-base font-semibold text-ink">{value}</p>
      <p className="text-[10px] text-ink-muted">{label}</p>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
