"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, FileText, Inbox, ListChecks, Plus, Route, Search, Sparkles, Trash2, X } from "lucide-react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { markAirlineApplicationsSeen } from "@/lib/client-notification-state";
import type { LiveTender, LiveTenderApplication, TenderRouteFrequency } from "@/lib/services/tender-workflow-store";
import { useAirlineGsaWorkflow } from "@/lib/use-airline-gsa-workflow";
import type { Status, TenderApplication } from "@/lib/types";

type ApplicationStatusFilter = "all" | "pending" | "shortlisted" | "accepted" | "rejected";
type ApplicationSort = "score-desc" | "submitted-desc" | "gsa-asc" | "status-asc";
type RouteDraft = Omit<TenderRouteFrequency, "id">;

const emptyRoute: RouteDraft = {
  origin: "",
  destination: "",
  operatingDays: "",
  frequencyPerWeek: 1,
  aircraft: "",
};

const emptyTenderForm = {
  title: "",
  countryScope: "",
  annualTonnage: "",
  productMix: "",
  deadline: "",
  expectedStart: "",
  awardMode: "single" as "single" | "multi",
  maxAwards: "1",
  commercialModel: "commission" as "commission" | "capacity-risk" | "hybrid",
  requirements: "",
  commercialExpectations: "",
};

const TENDER_APPLICATIONS_SEEN_KEY = "airgsa.airline.applications.tenderSeenAt";

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
  const tenderIdParam = searchParams.get("tender");
  const [applications, setApplications] = useState<LiveTenderApplication[]>([]);
  const [tenders, setTenders] = useState<LiveTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApplicationId, setPendingApplicationId] = useState<string | null>(null);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatusFilter>("all");
  const [sortBy, setSortBy] = useState<ApplicationSort>("score-desc");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyTenderForm);
  const [createRoutes, setCreateRoutes] = useState<RouteDraft[]>([{ ...emptyRoute }]);
  const [creatingTender, setCreatingTender] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [tenderSeenAt, setTenderSeenAt] = useState<Record<string, number>>({});
  const workflowApplications = useMemo(() => applications.map(toWorkflowApplication), [applications]);
  const workflow = useAirlineGsaWorkflow(workflowApplications);

  useEffect(() => {
    let active = true;
    markAirlineApplicationsSeen();

    fetch("/api/applications")
      .then((res) => (res.ok ? res.json() : { applications: [], tenders: [] }))
      .then((data) => {
        if (!active) return;
        setApplications(data.applications ?? []);
        setTenders(data.tenders ?? []);
      })
      .catch(() => {
        if (!active) return;
        setApplications([]);
        setTenders([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TENDER_APPLICATIONS_SEEN_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      setTenderSeenAt(
        Object.fromEntries(
          Object.entries(parsed)
            .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
            .map(([key, value]) => [key, value as number]),
        ),
      );
    } catch {
      setTenderSeenAt({});
    }
  }, []);

  const tenderTitleById = useMemo(() => new Map(tenders.map((tender) => [tender.id, tender.title])), [tenders]);
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
        return {
          tender,
          applicationCount: rows.length,
          pendingCount: rows.filter((row) => row.status === "pending").length,
          shortlistedCount: rows.filter((row) => row.status === "shortlisted").length,
          acceptedCount: rows.filter((row) => row.status === "accepted").length,
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
    () => (selectedTenderId ? applications.filter((application) => application.tenderId === selectedTenderId) : []),
    [applications, selectedTenderId],
  );
  const visibleApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return selectedTenderApplications
      .filter((application) => {
        if (statusFilter !== "all" && application.status !== statusFilter) return false;
        if (!normalizedQuery) return true;

        const tenderTitle = tenderTitleById.get(application.tenderId) ?? "";
        const searchable = [
          application.gsaName,
          application.contactName,
          application.email,
          tenderTitle,
          application.proposedCommission,
          application.namedAccountCoverage,
          application.monthlySalesTarget,
          application.networkPlan,
          application.status,
        ].join(" ").toLowerCase();

        return searchable.includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (sortBy === "submitted-desc") {
          return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
        }
        if (sortBy === "gsa-asc") return left.gsaName.localeCompare(right.gsaName);
        if (sortBy === "status-asc") return statusRank(left.status) - statusRank(right.status);
        return scoreApplication(right) - scoreApplication(left);
      });
  }, [query, selectedTenderApplications, sortBy, statusFilter, tenderTitleById]);
  const acceptedCount = selectedTenderApplications.filter((application) => application.status === "accepted").length;
  const shortlistedCount = selectedTenderApplications.filter((application) => application.status === "shortlisted").length;
  const selectedAwardSlots = selectedTender ? getAwardSlots(selectedTender) : 1;
  const selectedAwardFilled = Boolean(selectedTender && acceptedCount >= selectedAwardSlots);
  const averageScore = selectedTenderApplications.length
    ? Math.round(selectedTenderApplications.reduce((sum, application) => sum + scoreApplication(application), 0) / selectedTenderApplications.length)
    : 0;

  useEffect(() => {
    if (loading) return;
    if (tenderIdParam && tenderOptions.some((option) => option.tender.id === tenderIdParam)) {
      setSelectedTenderId(tenderIdParam);
      const option = tenderOptions.find((item) => item.tender.id === tenderIdParam);
      if (option) markTenderApplicationsSeen(option.tender.id, option.latestPendingSubmittedAt);
      return;
    }
    if (selectedTenderId && tenderOptions.some((option) => option.tender.id === selectedTenderId)) return;
    setSelectedTenderId(tenderOptions[0]?.tender.id ?? null);
  }, [loading, selectedTenderId, tenderIdParam, tenderOptions]);

  async function updateStatus(application: LiveTenderApplication, status: Extract<Status, "pending" | "shortlisted" | "accepted" | "rejected">) {
    setPendingApplicationId(application.id);
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        window.alert(data.error ?? "Application status could not be updated");
        return;
      }
      const data = await res.json();
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
      workflow.setApplicationStatus(toWorkflowApplication(application), status);
    } finally {
      setPendingApplicationId(null);
    }
  }

  async function createTender(status: "draft" | "open") {
    setCreatingTender(true);
    setCreateError(null);

    const activeRoutes = createRoutes
      .filter((route) => route.origin.trim() && route.destination.trim())
      .map((route, index) => ({
        ...route,
        id: `route-${index + 1}`,
        origin: route.origin.trim().toUpperCase(),
        destination: route.destination.trim().toUpperCase(),
        frequencyPerWeek: Number(route.frequencyPerWeek) || 1,
      }));
    const regions = createForm.countryScope.split(",").map((item) => item.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          countryScope: createForm.countryScope.trim(),
          regions,
          lanes: activeRoutes.length
            ? activeRoutes.map((route) => `${route.origin}-${route.destination}`).join(", ")
            : createForm.countryScope.trim(),
          annualTonnage: Number(createForm.annualTonnage) || 0,
          productMix: createForm.productMix.trim(),
          deadline: createForm.deadline,
          expectedStart: createForm.expectedStart,
          status,
          awardMode: createForm.awardMode,
          maxAwards: Number(createForm.maxAwards) || 1,
          commercialModel: createForm.commercialModel,
          requirements: createForm.requirements.split("\n").map((item) => item.trim()).filter(Boolean),
          commercialExpectations: createForm.commercialExpectations.trim(),
          routes: activeRoutes,
          attachments: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error ?? "Tender could not be saved");
        return;
      }

      const data = await res.json();
      const tender = data.tender as LiveTender;
      setTenders((current) => [tender, ...current]);
      setSelectedTenderId(tender.id);
      setCreateForm(emptyTenderForm);
      setCreateRoutes([{ ...emptyRoute }]);
      setCreateOpen(false);
    } catch {
      setCreateError("Tender could not be saved. Please try again.");
    } finally {
      setCreatingTender(false);
    }
  }

  function updateCreateRoute(index: number, patch: Partial<RouteDraft>) {
    setCreateRoutes((current) => current.map((route, itemIndex) => (itemIndex === index ? { ...route, ...patch } : route)));
  }

  function markTenderApplicationsSeen(tenderId: string, latestPendingSubmittedAt: number) {
    const seenAt = Math.max(Date.now(), latestPendingSubmittedAt);
    setTenderSeenAt((current) => {
      const next = { ...current, [tenderId]: seenAt };
      window.localStorage.setItem(TENDER_APPLICATIONS_SEEN_KEY, JSON.stringify(next));
      return next;
    });
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
        const rowTender = tenders.find((tender) => tender.id === row.tenderId);
        const rowTenderApplications = applications.filter((application) => application.tenderId === row.tenderId);
        const rowAwardSlots = rowTender ? getAwardSlots(rowTender) : 1;
        const rowAwardFilled = rowTenderApplications.filter((application) => application.status === "accepted").length >= rowAwardSlots;
        const canAccept = !isAccepted && !isPending && !rowAwardFilled;
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
            <Button size="sm" disabled={!canAccept && !isAccepted} onClick={() => updateStatus(row, "accepted")}>
              {isPending ? "Updating..." : isAccepted ? <><CheckCircle2 className="h-3.5 w-3.5" /> Accepted</> : rowAwardFilled ? "Award filled" : "Accept"}
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
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-brand" />
                Select tender
              </CardTitle>
              <p className="text-sm text-ink-muted">
                Pick the tender first, then review only the GSAs that applied for that specific scope.
              </p>
            </div>
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              Create tender
            </Button>
          </CardHeader>
          <CardContent>
            {createOpen && (
              <div className="mb-5 rounded-xl border border-brand/25 bg-surface p-4 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">New GSA tender</p>
                    <p className="mt-1 text-sm text-ink-muted">Create the tender here, then review applications under the same tender context.</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setCreateOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Tender title">
                    <Input value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} placeholder="Saudi Cargo representation Benelux" />
                  </Field>
                  <Field label="Country / market scope">
                    <Input value={createForm.countryScope} onChange={(event) => setCreateForm({ ...createForm, countryScope: event.target.value })} placeholder="Netherlands, Belgium, Luxembourg" />
                  </Field>
                  <Field label="Expected annual tonnage">
                    <Input value={createForm.annualTonnage} onChange={(event) => setCreateForm({ ...createForm, annualTonnage: event.target.value })} type="number" placeholder="18000" />
                  </Field>
                  <Field label="Product focus">
                    <Input value={createForm.productMix} onChange={(event) => setCreateForm({ ...createForm, productMix: event.target.value })} placeholder="Pharma, perishables, general cargo" />
                  </Field>
                  <Field label="Expected start">
                    <Input value={createForm.expectedStart} onChange={(event) => setCreateForm({ ...createForm, expectedStart: event.target.value })} type="date" />
                  </Field>
                  <Field label="Application deadline">
                    <Input value={createForm.deadline} onChange={(event) => setCreateForm({ ...createForm, deadline: event.target.value })} type="date" />
                  </Field>
                  <Field label="Award model">
                    <Select
                      value={createForm.awardMode}
                      onChange={(event) => setCreateForm({
                        ...createForm,
                        awardMode: event.target.value as "single" | "multi",
                        maxAwards: event.target.value === "single" ? "1" : createForm.maxAwards,
                      })}
                    >
                      <option value="single">Single winner</option>
                      <option value="multi">Multiple GSAs</option>
                    </Select>
                  </Field>
                  <Field label="Award slots">
                    <Input
                      value={createForm.maxAwards}
                      onChange={(event) => setCreateForm({ ...createForm, maxAwards: event.target.value })}
                      type="number"
                      min={1}
                      max={10}
                      disabled={createForm.awardMode === "single"}
                    />
                  </Field>
                  <Field label="Commercial model" className="md:col-span-2">
                    <Select
                      value={createForm.commercialModel}
                      onChange={(event) => setCreateForm({ ...createForm, commercialModel: event.target.value as "commission" | "capacity-risk" | "hybrid" })}
                    >
                      <option value="commission">Commission bid - airline controls rate, GSA earns commission</option>
                      <option value="capacity-risk">Capacity risk - GSA sells allocated capacity profitably</option>
                      <option value="hybrid">Hybrid - fixed commission with volume or yield accelerator</option>
                    </Select>
                  </Field>
                  <Field label="Requirements" className="md:col-span-2">
                    <Textarea
                      value={createForm.requirements}
                      onChange={(event) => setCreateForm({ ...createForm, requirements: event.target.value })}
                      placeholder={"IATA / CASS capability\nNamed key account pipeline\nMonthly KPI reporting"}
                    />
                  </Field>
                  <Field label="Commercial expectations" className="md:col-span-2">
                    <Textarea
                      value={createForm.commercialExpectations}
                      onChange={(event) => setCreateForm({ ...createForm, commercialExpectations: event.target.value })}
                      placeholder="Describe target customers, reporting cadence, service expectations, and handover model."
                    />
                  </Field>
                </div>

                <section className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">Route scope</p>
                      <p className="text-xs text-ink-muted">Leave empty for country-only tenders.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCreateRoutes([...createRoutes, { ...emptyRoute }])}>
                      <Plus className="h-4 w-4" />
                      Add route
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {createRoutes.map((route, index) => (
                      <div key={index} className="grid gap-2 rounded-lg border border-border-ui bg-surface2 p-3 md:grid-cols-[1fr_1fr_150px_1fr_1fr_auto]">
                        <Input value={route.origin} onChange={(event) => updateCreateRoute(index, { origin: event.target.value })} placeholder="Origin" />
                        <Input value={route.destination} onChange={(event) => updateCreateRoute(index, { destination: event.target.value })} placeholder="Destination" />
                        <Input value={route.frequencyPerWeek || ""} onChange={(event) => updateCreateRoute(index, { frequencyPerWeek: Number(event.target.value) })} type="number" min={1} max={14} placeholder="Flights / week" />
                        <Input value={route.operatingDays ?? ""} onChange={(event) => updateCreateRoute(index, { operatingDays: event.target.value })} placeholder="Days if known" />
                        <Input value={route.aircraft ?? ""} onChange={(event) => updateCreateRoute(index, { aircraft: event.target.value })} placeholder="Aircraft / notes" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => setCreateRoutes(createRoutes.filter((_, itemIndex) => itemIndex !== index))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>

                {createError && <p className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{createError}</p>}

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button disabled={creatingTender || !createForm.title.trim()} onClick={() => createTender("open")}>
                    {creatingTender ? "Publishing..." : "Publish tender"}
                  </Button>
                  <Button disabled={creatingTender || !createForm.title.trim()} variant="outline" onClick={() => createTender("draft")}>
                    Save draft
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <p className="p-6 text-sm text-ink-muted">Loading tenders...</p>
            ) : tenderOptions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border-ui bg-surface2 p-10 text-center">
                <Inbox className="h-10 w-10 text-ink-muted/40" />
                <div>
                  <p className="font-semibold text-ink">No tenders available</p>
                  <p className="mt-1 text-sm text-ink-muted">Create a tender first. Applications will be grouped underneath it.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-3">
                {tenderOptions.map((option) => {
                  const selected = option.tender.id === selectedTenderId;
                  const hasNewApplications = option.pendingCount > 0 && option.latestPendingSubmittedAt > (tenderSeenAt[option.tender.id] ?? 0);
                  const lifecycle = getTenderLifecycle(option.tender, option.acceptedCount, option.awardSlots);
                  return (
                    <button
                      key={option.tender.id}
                      type="button"
                      aria-label={`${option.tender.title}${hasNewApplications ? `, ${option.pendingCount} new applications` : ""}`}
                      onClick={() => {
                        setSelectedTenderId(option.tender.id);
                        setStatusFilter("all");
                        setQuery("");
                        markTenderApplicationsSeen(option.tender.id, option.latestPendingSubmittedAt);
                      }}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        selected
                          ? "border-brand bg-brand-light shadow-[inset_3px_0_0_var(--brand)]"
                          : "border-border-ui bg-surface2 hover:border-brand/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition-all duration-200 ${
                                hasNewApplications ? "bg-brand/10 opacity-100" : "opacity-0"
                              }`}
                              aria-hidden={!hasNewApplications}
                              title={hasNewApplications ? `${option.pendingCount} new applications` : undefined}
                            >
                              <span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
                            </span>
                            <p className="truncate font-semibold text-ink">{option.tender.title}</p>
                          </div>
                          <p className="mt-1 text-xs text-ink-muted">{option.tender.countryScope || option.tender.lanes || "No scope"}</p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <Badge variant={option.awardSlots > 1 ? "default" : "muted"}>
                              {option.awardSlots > 1 ? `${option.awardSlots} winners` : "Single winner"}
                            </Badge>
                            <Badge variant="muted">{getCommercialModelLabel(option.tender)}</Badge>
                          </div>
                        </div>
                        <Badge variant={lifecycle.variant}>{lifecycle.label}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                        <MiniCount label="Apps" value={option.applicationCount} />
                        <MiniCount label="Pending" value={option.pendingCount} />
                        <MiniCount label="Shortlist" value={option.shortlistedCount} />
                        <MiniCount label={`Awarded ${option.acceptedCount}/${option.awardSlots}`} value={option.acceptedCount} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedTender && (
          <Card>
            <CardContent className="grid gap-4 p-4 xl:grid-cols-[1.2fr_.8fr_.8fr_.8fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">Tender decision room</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{selectedTender.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {selectedTender.commercialExpectations || "Review proposals, compare commercial models, and award the mandate."}
                </p>
              </div>
              <DecisionTile
                label="Award rule"
                value={selectedAwardSlots > 1 ? `${selectedAwardSlots} GSA awards` : "Single winner"}
                helper={selectedAwardSlots > 1 ? "Multiple GSAs can be appointed" : "Award closes the tender"}
              />
              <DecisionTile
                label="Commercial model"
                value={getCommercialModelLabel(selectedTender)}
                helper={getCommercialModelHelper(selectedTender)}
              />
              <DecisionTile
                label="Decision progress"
                value={`${acceptedCount}/${selectedAwardSlots} awarded`}
                helper={selectedAwardFilled ? "Award capacity filled" : `${Math.max(0, selectedAwardSlots - acceptedCount)} award slot open`}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <InsightMetric label="Tender applications" value={String(selectedTenderApplications.length)} helper={selectedTender?.title ?? "Select a tender"} />
          <InsightMetric label="Shortlisted" value={String(shortlistedCount)} helper="Favorites for review" />
          <InsightMetric label="Accepted GSAs" value={String(acceptedCount)} helper="Available for route assignment" />
          <InsightMetric label="Average fit score" value={selectedTenderApplications.length ? `${averageScore}/100` : "-"} helper="Selected tender only" />
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{selectedTender ? `Applicants for ${selectedTender.title}` : "Applicants"}</CardTitle>
              <p className="text-sm text-ink-muted">
                Shortlisting marks favored GSAs for follow-up within this tender. Accepting moves the GSA into route and contract allocation.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_210px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search GSA, tender, contacts, proposal..."
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
                  {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-1 text-xs opacity-75">({countStatus(selectedTenderApplications, status)})</span>
                </Button>
              ))}
            </div>

            {loading ? (
              <p className="p-6 text-sm text-ink-muted">Loading applications...</p>
            ) : visibleApplications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border-ui bg-surface2 p-10 text-center">
                <Inbox className="h-10 w-10 text-ink-muted/40" />
                <div>
                  <p className="font-semibold text-ink">No matching applications</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Adjust the filters or search term to review more submissions.
                  </p>
                </div>
              </div>
            ) : (
              <DataTable columns={columns} data={visibleApplications} />
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

function statusRank(status: Status) {
  const order: Record<string, number> = {
    shortlisted: 0,
    pending: 1,
    accepted: 2,
    rejected: 3,
  };
  return order[status] ?? 9;
}

function countStatus(applications: LiveTenderApplication[], status: ApplicationStatusFilter) {
  if (status === "all") return applications.length;
  return applications.filter((application) => application.status === status).length;
}

function getAwardSlots(tender: LiveTender) {
  if (tender.awardMode === "multi") return Math.max(2, tender.maxAwards ?? 2);
  return Math.max(1, tender.maxAwards ?? 1);
}

function getTenderLifecycle(tender: LiveTender, acceptedCount: number, awardSlots: number) {
  if (tender.status === "draft") return { label: "Designing", variant: "muted" as const };
  if (acceptedCount >= awardSlots) return { label: "Awarded", variant: "success" as const };
  if (acceptedCount > 0) return { label: "Part-awarded", variant: "warning" as const };
  if (tender.status === "closed") return { label: "Closed", variant: "muted" as const };
  return { label: "Live tender", variant: "default" as const };
}

function getCommercialModelLabel(tender: LiveTender) {
  const model = tender.commercialModel ?? "commission";
  if (model === "capacity-risk") return "Capacity risk";
  if (model === "hybrid") return "Hybrid model";
  return "Commission bid";
}

function getCommercialModelHelper(tender: LiveTender) {
  const model = tender.commercialModel ?? "commission";
  if (model === "capacity-risk") return "GSA must sell capacity profitably";
  if (model === "hybrid") return "Commission plus yield or volume upside";
  return "GSAs compete on commission and sales plan";
}

function MiniCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface px-2 py-2">
      <p className="text-base font-semibold text-ink">{value}</p>
      <p className="text-[10px] text-ink-muted">{label}</p>
    </div>
  );
}

function DecisionTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ink-muted">{helper}</p>
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
