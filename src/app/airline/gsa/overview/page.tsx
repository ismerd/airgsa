"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  LockKeyhole,
  PackageCheck,
  Plus,
  Route,
  Search,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { assignableRoutes, type AssignableRoute, type AssignedGsa } from "@/lib/airline-gsa-workflow";
import { realGsaPartners, type RealGsaPartner } from "@/lib/real-gsa-data";
import type { LiveTenderApplication } from "@/lib/services/tender-workflow-store";
import { useAirlineGsaWorkflow } from "@/lib/use-airline-gsa-workflow";
import type { TenderApplication } from "@/lib/types";

type RouteStatusFilter = "all" | "assigned" | "unassigned" | "eligible" | "blocked";
type RouteEligibility = "available" | "assigned-to-selected" | "assigned-to-other" | "out-of-scope" | "no-selection";

export default function AirlineGsaOverviewPage() {
  const [applications, setApplications] = useState<LiveTenderApplication[]>([]);
  const workflowApplications = useMemo(() => applications.map(toWorkflowApplication), [applications]);
  const workflow = useAirlineGsaWorkflow(workflowApplications);
  const acceptedApplicationByGsaId = useMemo(() => {
    const map = new Map<string, LiveTenderApplication>();
    for (const application of applications) {
      if (application.status !== "accepted") continue;
      const current = map.get(application.gsaId);
      if (!current || application.updatedAt > current.updatedAt) map.set(application.gsaId, application);
    }
    return map;
  }, [applications]);
  const acceptedPartners = useMemo(
    () => realGsaPartners.filter((partner) => acceptedApplicationByGsaId.has(partner.id)),
    [acceptedApplicationByGsaId],
  );
  const [selectedGsaId, setSelectedGsaId] = useState<string>("");
  const [selectedRouteQuery, setSelectedRouteQuery] = useState("");
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [routePickerQuery, setRoutePickerQuery] = useState("");
  const [routePickerMarket, setRoutePickerMarket] = useState("all");
  const [routePickerOrigin, setRoutePickerOrigin] = useState("all");
  const [routePickerStatus, setRoutePickerStatus] = useState<RouteStatusFilter>("eligible");
  const [pendingTransferRouteId, setPendingTransferRouteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/applications")
      .then((res) => (res.ok ? res.json() : { applications: [] }))
      .then((data) => {
        if (active) setApplications(data.applications ?? []);
      })
      .catch(() => {
        if (active) setApplications([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (acceptedPartners.length === 0) {
      setSelectedGsaId("");
      return;
    }

    if (!selectedGsaId || !acceptedPartners.some((partner) => partner.id === selectedGsaId)) {
      setSelectedGsaId(acceptedPartners[0].id);
    }
  }, [acceptedPartners, selectedGsaId]);

  const selectedPartner = acceptedPartners.find((partner) => partner.id === selectedGsaId) ?? null;
  const visibleAssignments = useMemo(() => {
    const acceptedPartnerIds = new Set(acceptedPartners.map((partner) => partner.id));
    return Object.fromEntries(
      Object.entries(workflow.state.acceptedGsas).filter(([gsaId]) => acceptedPartnerIds.has(gsaId)),
    );
  }, [acceptedPartners, workflow.state.acceptedGsas]);
  const selectedAssignment = selectedPartner ? visibleAssignments[selectedPartner.id] : null;
  const selectedApplication = selectedPartner ? acceptedApplicationByGsaId.get(selectedPartner.id) ?? null : null;
  const assignedRouteIds = new Set(Object.values(visibleAssignments).flatMap((assignment) => assignment.routeIds));
  const assignedRouteCount = assignedRouteIds.size;
  const assignedRoutes = assignableRoutes.filter((route) => assignedRouteIds.has(route.id));
  const markets = Array.from(new Set(assignableRoutes.map((route) => route.market))).sort();
  const origins = Array.from(new Set(assignableRoutes.map((route) => route.origin))).sort();
  const hasContractPeriod = Boolean(selectedAssignment?.contractStart && selectedAssignment?.contractEnd);

  const selectedRoutes = selectedAssignment
    ? assignableRoutes.filter((route) => selectedAssignment.routeIds.includes(route.id))
    : [];
  const visibleSelectedRoutes = selectedRoutes.filter((route) => {
    const searchable = `${route.id} ${route.market} ${route.origin} ${route.destination}`.toLowerCase();
    return !selectedRouteQuery || searchable.includes(selectedRouteQuery.toLowerCase());
  });
  const routeCandidates = assignableRoutes.filter((route) => {
    const owner = getRouteOwner(route.id, acceptedPartners, visibleAssignments);
    const eligibility = selectedPartner ? getEligibility(route, selectedPartner, owner?.partner.id ?? null) : "no-selection";
    const searchable = `${route.id} ${route.market} ${route.origin} ${route.destination} ${owner?.partner.name ?? ""}`.toLowerCase();

    if (routePickerQuery && !searchable.includes(routePickerQuery.toLowerCase())) return false;
    if (routePickerMarket !== "all" && route.market !== routePickerMarket) return false;
    if (routePickerOrigin !== "all" && route.origin !== routePickerOrigin) return false;
    if (routePickerStatus === "assigned" && !owner) return false;
    if (routePickerStatus === "unassigned" && owner) return false;
    if (routePickerStatus === "eligible" && eligibility !== "available") return false;
    if (routePickerStatus === "blocked" && eligibility !== "assigned-to-other" && eligibility !== "out-of-scope") return false;
    return true;
  });
  const selectedCapacity = selectedRoutes.reduce((sum, route) => sum + route.weeklyCapacityKg, 0);
  const pendingTransferRoute = pendingTransferRouteId
    ? assignableRoutes.find((route) => route.id === pendingTransferRouteId) ?? null
    : null;
  const pendingTransferOwner = pendingTransferRoute
    ? getRouteOwner(pendingTransferRoute.id, acceptedPartners, visibleAssignments)
    : null;

  return (
    <>
      <Topbar title="GSA partner workspace" subtitle="Contract-bound route allocation" />
      <main className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Accepted GSAs" value={String(acceptedPartners.length)} />
          <Metric label="Assigned routes" value={String(assignedRouteCount)} />
          <Metric label="Assigned capacity" value={`${Math.round(assignedRoutes.reduce((sum, route) => sum + route.weeklyCapacityKg, 0) / 1000)}t`} />
        </div>

        {acceptedPartners.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <UsersRound className="h-10 w-10 text-ink-muted/50" />
              <div>
                <p className="text-lg font-semibold text-ink">No accepted GSAs yet</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Accept a GSA application first. Accepted partners become available for contract-bound route allocation here.
                </p>
              </div>
              <Button asChild>
                <Link href="/airline/applications">
                  Review applications
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-brand" />
                      Working GSAs
                    </CardTitle>
                    <p className="mt-1 text-sm text-ink-muted">
                      These partners have accepted awards and can receive contract terms, targets, and route allocations.
                    </p>
                  </div>
                  <Badge variant="muted">{acceptedPartners.length} active partner{acceptedPartners.length === 1 ? "" : "s"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {acceptedPartners.map((partner) => (
                  <PartnerContractCard
                    key={partner.id}
                    partner={partner}
                    assignment={visibleAssignments[partner.id]}
                    application={acceptedApplicationByGsaId.get(partner.id) ?? null}
                    selected={partner.id === selectedGsaId}
                    onSelect={() => setSelectedGsaId(partner.id)}
                  />
                ))}
              </CardContent>
            </Card>

            {selectedPartner && selectedAssignment && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-brand" />
                        Contract controls for {selectedPartner.name}
                      </CardTitle>
                      <p className="mt-1 text-sm text-ink-muted">
                        Set the working conditions first, then assign only the routes that belong to this contract.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/airline/gsa/${selectedPartner.id}`}>Open full profile</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-4">
                    <ContractField label="Contract start">
                      <Input
                        type="date"
                        value={selectedAssignment.contractStart ?? ""}
                        onChange={(event) => workflow.setContractPeriod(selectedPartner.id, { contractStart: event.target.value })}
                      />
                    </ContractField>
                    <ContractField label="Contract end">
                      <Input
                        type="date"
                        min={selectedAssignment.contractStart}
                        value={selectedAssignment.contractEnd ?? ""}
                        onChange={(event) => workflow.setContractPeriod(selectedPartner.id, { contractEnd: event.target.value })}
                      />
                    </ContractField>
                    <ContractField label="Target load factor">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedAssignment.targetLoadFactor ?? ""}
                        placeholder="82"
                        onChange={(event) =>
                          workflow.setContractTerms(selectedPartner.id, {
                            targetLoadFactor: event.target.value ? Number(event.target.value) : undefined,
                          })
                        }
                      />
                    </ContractField>
                    <ContractField label="Monthly tonnage target">
                      <Input
                        type="number"
                        min={0}
                        value={selectedAssignment.monthlyTonnageTargetKg ? Math.round(selectedAssignment.monthlyTonnageTargetKg / 1000) : ""}
                        placeholder="1500"
                        onChange={(event) =>
                          workflow.setContractTerms(selectedPartner.id, {
                            monthlyTonnageTargetKg: event.target.value ? Number(event.target.value) * 1000 : undefined,
                          })
                        }
                      />
                    </ContractField>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
                    <ContractField label="Commercial terms">
                      <Textarea
                        value={selectedAssignment.commercialTerms ?? selectedApplication?.proposedCommission ?? ""}
                        onChange={(event) =>
                          workflow.setContractTerms(selectedPartner.id, { commercialTerms: event.target.value })
                        }
                        placeholder="Commission, incentive, payment terms, minimum commitment..."
                      />
                    </ContractField>
                    <ContractField label="Reporting cadence">
                      <Select
                        value={selectedAssignment.reportingCadence ?? "weekly"}
                        onChange={(event) =>
                          workflow.setContractTerms(selectedPartner.id, { reportingCadence: event.target.value })
                        }
                      >
                        <option value="weekly">Weekly sales review</option>
                        <option value="biweekly">Bi-weekly review</option>
                        <option value="monthly">Monthly QBR pack</option>
                      </Select>
                    </ContractField>
                  </div>

                  {!hasContractPeriod && (
                    <div className="rounded-lg border border-amber-500/25 bg-warning-bg p-3 text-xs text-warning">
                      Set contract start and end before assigning routes. The assignment is only valid for that contract period.
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-4">
                    <MiniMetric label="Routes" value={String(selectedRoutes.length)} />
                    <MiniMetric label="Weekly capacity" value={`${Math.round(selectedCapacity / 1000)}t`} />
                    <MiniMetric label="Load factor target" value={selectedAssignment.targetLoadFactor ? `${selectedAssignment.targetLoadFactor}%` : "-"} />
                    <MiniMetric
                      label="Monthly target"
                      value={selectedAssignment.monthlyTonnageTargetKg ? `${Math.round(selectedAssignment.monthlyTonnageTargetKg / 1000)}t` : "-"}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedPartner && selectedAssignment && (
              <Card>
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Routes for {selectedPartner.name}</CardTitle>
                      <p className="mt-1 text-sm text-ink-muted">
                        Only routes already selected for this GSA are shown here. Add more routes through the route picker below.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted">{selectedRoutes.length} selected</Badge>
                      <Button size="sm" onClick={() => setRoutePickerOpen((open) => !open)}>
                        <Plus className="h-4 w-4" />
                        Add route
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <Input
                      value={selectedRouteQuery}
                      onChange={(event) => setSelectedRouteQuery(event.target.value)}
                      placeholder="Search selected routes..."
                      className="pl-9"
                    />
                  </div>

                  {routePickerOpen && (
                    <div className="rounded-xl border border-brand/20 bg-brand-light/40 p-4">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold text-ink">Add routes to this contract</p>
                          <p className="mt-1 text-sm text-ink-muted">
                            Filter by market/country, origin airport, eligibility, or search the full route list.
                          </p>
                        </div>
                        <Badge variant="muted">{routeCandidates.length} available in picker</Badge>
                      </div>
                      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_180px_180px_200px]">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                          <Input
                            value={routePickerQuery}
                            onChange={(event) => setRoutePickerQuery(event.target.value)}
                            placeholder="Search all routes..."
                            className="pl-9"
                          />
                        </div>
                        <Select value={routePickerMarket} onChange={(event) => setRoutePickerMarket(event.target.value)}>
                          <option value="all">All markets</option>
                          {markets.map((market) => (
                            <option key={market} value={market}>{market}</option>
                          ))}
                        </Select>
                        <Select value={routePickerOrigin} onChange={(event) => setRoutePickerOrigin(event.target.value)}>
                          <option value="all">All origins</option>
                          {origins.map((origin) => (
                            <option key={origin} value={origin}>From {origin}</option>
                          ))}
                        </Select>
                        <Select value={routePickerStatus} onChange={(event) => setRoutePickerStatus(event.target.value as RouteStatusFilter)}>
                          <option value="eligible">Eligible only</option>
                          <option value="unassigned">Unassigned</option>
                          <option value="assigned">Assigned elsewhere</option>
                          <option value="blocked">Blocked / out of scope</option>
                          <option value="all">Entire route list</option>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="overflow-x-auto">
                    {visibleSelectedRoutes.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border-ui bg-surface2 p-8 text-center">
                        <Route className="mx-auto h-9 w-9 text-ink-muted/45" />
                        <p className="mt-3 font-semibold text-ink">No routes selected for this GSA yet</p>
                        <p className="mt-1 text-sm text-ink-muted">
                          Use Add route to attach the first route to this contract.
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-ui text-xs font-semibold uppercase tracking-wider text-ink-muted">
                            <th className="pb-3 pr-4 text-left">Route</th>
                            <th className="pb-3 pr-4 text-left">Market</th>
                            <th className="pb-3 pr-4 text-left">Capacity</th>
                            <th className="pb-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-ui">
                          {visibleSelectedRoutes.map((route) => (
                            <SelectedRouteRow
                              key={route.id}
                              route={route}
                              onUnassign={() => workflow.unassignRoute(selectedPartner.id, route.id)}
                            />
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {routePickerOpen && (
                    <div className="overflow-x-auto rounded-xl border border-border-ui">
                      <table className="w-full text-sm">
                        <thead className="bg-surface2">
                          <tr className="border-b border-border-ui text-xs font-semibold uppercase tracking-wider text-ink-muted">
                            <th className="px-4 py-3 text-left">Route</th>
                            <th className="px-4 py-3 text-left">Market</th>
                            <th className="px-4 py-3 text-left">Capacity</th>
                            <th className="px-4 py-3 text-left">Current GSA</th>
                            <th className="px-4 py-3 text-left">Eligibility</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-ui">
                          {routeCandidates.map((route) => {
                            const owner = getRouteOwner(route.id, acceptedPartners, visibleAssignments);
                            const eligibility = selectedPartner ? getEligibility(route, selectedPartner, owner?.partner.id ?? null) : "no-selection";
                            return (
                              <RouteRow
                                key={route.id}
                                route={route}
                                owner={owner?.partner ?? null}
                                eligibility={eligibility}
                                canAssign={Boolean(selectedPartner && hasContractPeriod && eligibility === "available")}
                                canTransfer={Boolean(selectedPartner && hasContractPeriod && eligibility === "assigned-to-other")}
                                onAssign={() => selectedPartner && workflow.assignRoute(selectedPartner.id, route.id)}
                                onUnassign={() => selectedPartner && workflow.unassignRoute(selectedPartner.id, route.id)}
                                onReviewTransfer={() => setPendingTransferRouteId(route.id)}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {pendingTransferRoute && selectedPartner && (
              <Card className="border-amber-500/30">
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-ink">Transfer {pendingTransferRoute.id} to {selectedPartner.name}?</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Current owner: {pendingTransferOwner?.partner.name ?? "Unassigned"}. This will remove the route from the current GSA and assign it to the selected GSA contract.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPendingTransferRouteId(null)}>Cancel</Button>
                    <Button
                      onClick={() => {
                        workflow.assignRoute(selectedPartner.id, pendingTransferRoute.id);
                        setPendingTransferRouteId(null);
                      }}
                    >
                      Confirm transfer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}

function PartnerContractCard({
  partner,
  assignment,
  application,
  selected,
  onSelect,
}: {
  partner: RealGsaPartner;
  assignment: AssignedGsa | undefined;
  application: LiveTenderApplication | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const assignedRoutesForPartner = assignment
    ? assignableRoutes.filter((route) => assignment.routeIds.includes(route.id))
    : [];
  const weeklyCapacity = assignedRoutesForPartner.reduce((sum, route) => sum + route.weeklyCapacityKg, 0);
  const hasContractPeriod = Boolean(assignment?.contractStart && assignment?.contractEnd);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-4 text-left transition ${
        selected
          ? "border-brand bg-brand-light shadow-[0_0_0_1px_rgba(26,90,255,0.16)]"
          : "border-border-ui bg-surface2 hover:border-brand/45 hover:bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">{partner.name}</p>
          <p className="mt-1 truncate text-xs text-ink-muted">{partner.contactName}</p>
        </div>
        <Badge variant={hasContractPeriod ? "success" : "warning"}>
          {hasContractPeriod ? "contract set" : "needs terms"}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <CardMetric label="Routes" value={String(assignedRoutesForPartner.length)} />
        <CardMetric label="Capacity" value={`${Math.round(weeklyCapacity / 1000)}t`} />
        <CardMetric label="LF target" value={assignment?.targetLoadFactor ? `${assignment.targetLoadFactor}%` : "-"} />
      </div>

      <div className="mt-4 grid gap-2 text-xs text-ink-muted">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-brand" />
          {assignment?.contractStart && assignment.contractEnd
            ? `${assignment.contractStart} to ${assignment.contractEnd}`
            : "No contract period set"}
        </span>
        <span className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-brand" />
          {assignment?.monthlyTonnageTargetKg
            ? `${Math.round(assignment.monthlyTonnageTargetKg / 1000)}t monthly target`
            : application?.monthlySalesTarget || "No monthly target set"}
        </span>
      </div>
    </button>
  );
}

function CardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface px-2 py-2">
      <p className="text-base font-semibold text-ink">{value}</p>
      <p className="text-[10px] text-ink-muted">{label}</p>
    </div>
  );
}

function ContractField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function SelectedRouteRow({ route, onUnassign }: { route: AssignableRoute; onUnassign: () => void }) {
  return (
    <tr className="align-top text-ink-muted">
      <td className="py-4 pr-4">
        <p className="font-mono font-semibold text-ink">{route.id}</p>
        <p className="mt-1 text-xs text-ink-muted">{route.origin} to {route.destination}</p>
      </td>
      <td className="py-4 pr-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="muted">{route.market}</Badge>
          <Badge variant={route.flightType === "freighter" ? "default" : "muted"}>
            {route.flightType === "freighter" ? "Cargo" : "Mixed"}
          </Badge>
          <Badge variant={route.priority === "recovery" ? "warning" : route.priority === "launch" ? "default" : "muted"}>
            {route.priority}
          </Badge>
        </div>
      </td>
      <td className="py-4 pr-4">
        <p className="font-semibold text-ink">{Math.round(route.weeklyCapacityKg / 1000)}t</p>
        <p className="text-xs text-ink-muted">weekly</p>
      </td>
      <td className="py-4 text-right">
        <Button size="sm" variant="outline" onClick={onUnassign}>
          Remove
        </Button>
      </td>
    </tr>
  );
}

function RouteRow({
  route,
  owner,
  eligibility,
  canAssign,
  canTransfer,
  onAssign,
  onUnassign,
  onReviewTransfer,
}: {
  route: AssignableRoute;
  owner: RealGsaPartner | null;
  eligibility: RouteEligibility;
  canAssign: boolean;
  canTransfer: boolean;
  onAssign: () => void;
  onUnassign: () => void;
  onReviewTransfer: () => void;
}) {
  const isAssignedToSelected = eligibility === "assigned-to-selected";

  return (
    <tr className="align-top text-ink-muted">
      <td className="py-4 pr-4">
        <p className="font-mono font-semibold text-ink">{route.id}</p>
        <p className="mt-1 text-xs text-ink-muted">{route.origin} to {route.destination}</p>
      </td>
      <td className="py-4 pr-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="muted">{route.market}</Badge>
          <Badge variant={route.flightType === "freighter" ? "default" : "muted"}>
            {route.flightType === "freighter" ? "Cargo" : "Mixed"}
          </Badge>
          <Badge variant={route.priority === "recovery" ? "warning" : route.priority === "launch" ? "default" : "muted"}>
            {route.priority}
          </Badge>
        </div>
      </td>
      <td className="py-4 pr-4">
        <p className="font-semibold text-ink">{Math.round(route.weeklyCapacityKg / 1000)}t</p>
        <p className="text-xs text-ink-muted">weekly</p>
      </td>
      <td className="py-4 pr-4">
        {owner ? (
          <span className="flex items-center gap-2 text-ink">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: owner.color }} />
            {owner.name}
          </span>
        ) : (
          <span className="text-ink-muted">Unassigned</span>
        )}
      </td>
      <td className="py-4 pr-4">
        <EligibilityBadge eligibility={eligibility} />
      </td>
      <td className="py-4 text-right">
        {isAssignedToSelected ? (
          <Button size="sm" variant="outline" onClick={onUnassign}>
            Remove
          </Button>
        ) : canAssign ? (
          <Button size="sm" onClick={onAssign}>
            Assign
          </Button>
        ) : canTransfer ? (
          <Button size="sm" variant="outline" onClick={onReviewTransfer}>
            Review transfer
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled>
            <LockKeyhole className="h-3.5 w-3.5" />
            Locked
          </Button>
        )}
      </td>
    </tr>
  );
}

function EligibilityBadge({ eligibility }: { eligibility: RouteEligibility }) {
  const config = {
    available: { label: "Eligible", variant: "success" as const, icon: CheckCircle2 },
    "assigned-to-selected": { label: "Assigned to selected GSA", variant: "success" as const, icon: CheckCircle2 },
    "assigned-to-other": { label: "Assigned elsewhere", variant: "warning" as const, icon: LockKeyhole },
    "out-of-scope": { label: "Market out of scope", variant: "muted" as const, icon: LockKeyhole },
    "no-selection": { label: "Select a GSA", variant: "muted" as const, icon: UsersRound },
  }[eligibility];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}

function getEligibility(route: AssignableRoute, partner: RealGsaPartner, ownerGsaId: string | null): RouteEligibility {
  if (ownerGsaId === partner.id) return "assigned-to-selected" as const;
  if (ownerGsaId) return "assigned-to-other" as const;
  if (!isRouteInPartnerScope(route, partner)) return "out-of-scope" as const;
  return "available" as const;
}

function isRouteInPartnerScope(route: AssignableRoute, partner: RealGsaPartner) {
  return partner.markets.includes(route.market) || partner.coverage.includes(route.market);
}

function toWorkflowApplication(application: LiveTenderApplication): TenderApplication {
  return {
    id: application.id,
    tenderId: application.tenderId,
    gsaId: application.gsaId,
    gsaName: application.gsaName,
    aiRating: Math.round((application.networkScore + application.complianceScore) / 40) / 10,
    commercialScore: application.financialScore,
    networkScore: application.networkScore,
    complianceScore: application.complianceScore,
    proposedCommission: application.proposedCommission,
    status: application.status,
    submittedAt: new Date(application.submittedAt).toLocaleDateString("en-GB"),
  };
}

function getRouteOwner(
  routeId: string,
  acceptedPartners: RealGsaPartner[],
  acceptedGsas: Record<string, { routeIds: string[] }>,
) {
  const owner = acceptedPartners.find((partner) => acceptedGsas[partner.id]?.routeIds.includes(routeId));
  return owner ? { partner: owner, assignment: acceptedGsas[owner.id] } : null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          <PackageCheck className="h-4 w-4 text-brand" />
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {label === "Weekly capacity" ? <PackageCheck className="h-3.5 w-3.5" /> : <Route className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
