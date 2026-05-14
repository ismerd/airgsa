"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  PackageCheck,
  Route,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { assignableRoutes, type AssignableRoute } from "@/lib/airline-gsa-workflow";
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
  const acceptedPartners = useMemo(
    () => realGsaPartners.filter((partner) => workflow.state.acceptedGsas[partner.id]),
    [workflow.state.acceptedGsas],
  );
  const [selectedGsaId, setSelectedGsaId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<RouteStatusFilter>("all");
  const [pendingTransferRouteId, setPendingTransferRouteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => res.json())
      .then((data) => setApplications(data.applications ?? []));
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
  const selectedAssignment = selectedPartner ? workflow.state.acceptedGsas[selectedPartner.id] : null;
  const assignedRouteIds = new Set(Object.values(workflow.state.acceptedGsas).flatMap((assignment) => assignment.routeIds));
  const assignedRouteCount = assignedRouteIds.size;
  const assignedRoutes = assignableRoutes.filter((route) => assignedRouteIds.has(route.id));
  const markets = Array.from(new Set(assignableRoutes.map((route) => route.market))).sort();
  const hasContractPeriod = Boolean(selectedAssignment?.contractStart && selectedAssignment?.contractEnd);

  const filteredRoutes = assignableRoutes.filter((route) => {
    const owner = getRouteOwner(route.id, acceptedPartners, workflow.state.acceptedGsas);
    const eligibility = selectedPartner ? getEligibility(route, selectedPartner, owner?.partner.id ?? null) : "no-selection";
    const searchable = `${route.id} ${route.market} ${route.origin} ${route.destination} ${owner?.partner.name ?? ""}`.toLowerCase();

    if (query && !searchable.includes(query.toLowerCase())) return false;
    if (marketFilter !== "all" && route.market !== marketFilter) return false;
    if (statusFilter === "assigned" && !owner) return false;
    if (statusFilter === "unassigned" && owner) return false;
    if (statusFilter === "eligible" && eligibility !== "available" && eligibility !== "assigned-to-selected") return false;
    if (statusFilter === "blocked" && eligibility !== "assigned-to-other" && eligibility !== "out-of-scope") return false;
    return true;
  });

  const selectedRoutes = selectedAssignment
    ? assignableRoutes.filter((route) => selectedAssignment.routeIds.includes(route.id))
    : [];
  const selectedCapacity = selectedRoutes.reduce((sum, route) => sum + route.weeklyCapacityKg, 0);
  const pendingTransferRoute = pendingTransferRouteId
    ? assignableRoutes.find((route) => route.id === pendingTransferRouteId) ?? null
    : null;
  const pendingTransferOwner = pendingTransferRoute
    ? getRouteOwner(pendingTransferRoute.id, acceptedPartners, workflow.state.acceptedGsas)
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
            <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-brand" />
                    Allocation control
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Accepted GSA
                    </label>
                    <Select value={selectedGsaId} onChange={(event) => setSelectedGsaId(event.target.value)}>
                      {acceptedPartners.map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {selectedPartner && selectedAssignment && (
                    <>
                      <div className="rounded-lg border border-border-ui bg-surface2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{selectedPartner.name}</p>
                            <p className="mt-1 text-xs text-ink-muted">{selectedPartner.contactName}</p>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/airline/gsa/${selectedPartner.id}`}>Profile</Link>
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {selectedPartner.markets.map((market) => (
                            <Badge key={market} variant="muted">{market}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                            Contract start
                          </label>
                          <Input
                            type="date"
                            value={selectedAssignment.contractStart ?? ""}
                            onChange={(event) =>
                              workflow.setContractPeriod(selectedPartner.id, { contractStart: event.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                            Contract end
                          </label>
                          <Input
                            type="date"
                            min={selectedAssignment.contractStart}
                            value={selectedAssignment.contractEnd ?? ""}
                            onChange={(event) =>
                              workflow.setContractPeriod(selectedPartner.id, { contractEnd: event.target.value })
                            }
                          />
                        </div>
                      </div>

                      {!hasContractPeriod && (
                        <div className="rounded-lg border border-amber-500/25 bg-warning-bg p-3 text-xs text-warning">
                          Set contract start and end before assigning routes. The assignment is only valid for that contract period.
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <MiniMetric label="Routes" value={String(selectedRoutes.length)} />
                        <MiniMetric label="Weekly capacity" value={`${Math.round(selectedCapacity / 1000)}t`} />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Route allocation table</CardTitle>
                      <p className="mt-1 text-sm text-ink-muted">
                        Assign each route to one GSA for the contract duration. Existing route owners are protected from accidental overwrite.
                      </p>
                    </div>
                    <Badge variant="muted">{filteredRoutes.length} routes shown</Badge>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search route, market, airport or GSA..."
                        className="pl-9"
                      />
                    </div>
                    <Select value={marketFilter} onChange={(event) => setMarketFilter(event.target.value)}>
                      <option value="all">All markets</option>
                      {markets.map((market) => (
                        <option key={market} value={market}>{market}</option>
                      ))}
                    </Select>
                    <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as RouteStatusFilter)}>
                      <option value="all">All routes</option>
                      <option value="eligible">Eligible for selected GSA</option>
                      <option value="unassigned">Unassigned</option>
                      <option value="assigned">Assigned</option>
                      <option value="blocked">Blocked / out of scope</option>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-ui text-xs font-semibold uppercase tracking-wider text-ink-muted">
                        <th className="pb-3 pr-4 text-left">Route</th>
                        <th className="pb-3 pr-4 text-left">Market</th>
                        <th className="pb-3 pr-4 text-left">Capacity</th>
                        <th className="pb-3 pr-4 text-left">Current GSA</th>
                        <th className="pb-3 pr-4 text-left">Eligibility</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-ui">
                      {filteredRoutes.map((route) => {
                        const owner = getRouteOwner(route.id, acceptedPartners, workflow.state.acceptedGsas);
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
                </CardContent>
              </Card>
            </div>

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
