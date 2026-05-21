"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { AirportCodePicker } from "@/components/dashboard/freight-field-selects";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { LiveContractRoute, LivePartnerContract } from "@/lib/services/tender-workflow-store";

type RouteStatusFilter = "all" | "assigned" | "unassigned" | "eligible" | "blocked";
type RouteEligibility = "available" | "assigned-to-selected" | "assigned-to-other" | "no-selection";

type PartnerProfile = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  headquarters: string;
  coverage: string[];
  markets: string[];
  certifications: string[];
  cargoFocus: string;
  color: string;
  networkScore: number;
  financialScore: number;
  complianceScore: number;
  winRate: number;
  summary: string;
};

export default function AirlineGsaOverviewPage() {
  const [contracts, setContracts] = useState<LivePartnerContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [selectedRouteQuery, setSelectedRouteQuery] = useState("");
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [routePickerQuery, setRoutePickerQuery] = useState("");
  const [routePickerOrigin, setRoutePickerOrigin] = useState("all");
  const [routePickerStatus, setRoutePickerStatus] = useState<RouteStatusFilter>("eligible");
  const [newRouteOrigin, setNewRouteOrigin] = useState("");
  const [newRouteDestination, setNewRouteDestination] = useState("");
  const [newRouteFrequency, setNewRouteFrequency] = useState("1");
  const [newRouteOperatingDays, setNewRouteOperatingDays] = useState("");
  const [newRouteAircraft, setNewRouteAircraft] = useState("");
  const [pendingTransferRouteId, setPendingTransferRouteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshContracts();
  }, []);

  useEffect(() => {
    if (contracts.length === 0) {
      setSelectedContractId("");
      return;
    }

    if (!selectedContractId || !contracts.some((contract) => contract.id === selectedContractId)) {
      setSelectedContractId(contracts[0].id);
    }
  }, [contracts, selectedContractId]);

  const selectedContract = contracts.find((contract) => contract.id === selectedContractId) ?? null;
  const selectedPartner = selectedContract ? buildPartnerProfile(selectedContract) : null;
  const selectedRoutes = selectedContract?.contractRoutes.filter((route) => route.status === "assigned") ?? [];
  const visibleSelectedRoutes = selectedRoutes.filter((route) => {
    const searchable = `${route.id} ${route.origin} ${route.destination} ${route.aircraft ?? ""}`.toLowerCase();
    return !selectedRouteQuery || searchable.includes(selectedRouteQuery.toLowerCase());
  });
  const assignedRouteCount = contracts.reduce(
    (sum, contract) => sum + contract.contractRoutes.filter((route) => route.status === "assigned").length,
    0,
  );
  const weeklyFrequency = selectedRoutes.reduce((sum, route) => sum + route.frequencyPerWeek, 0);
  const origins = Array.from(new Set((selectedContract?.contractRoutes ?? []).map((route) => route.origin))).sort();
  const hasContractPeriod = Boolean(selectedContract?.startDate && selectedContract.endDate);
  const routeCandidates = (selectedContract?.contractRoutes ?? []).filter((route) => {
    const owner = selectedContract ? getRouteOwner(route.id, selectedContract.tenderId, contracts) : null;
    const eligibility = selectedContract ? getEligibility(selectedContract.id, owner?.contract.id ?? null) : "no-selection";
    const searchable = `${route.id} ${route.origin} ${route.destination} ${route.aircraft ?? ""} ${owner?.partner.name ?? ""}`.toLowerCase();

    if (routePickerQuery && !searchable.includes(routePickerQuery.toLowerCase())) return false;
    if (routePickerOrigin !== "all" && route.origin !== routePickerOrigin) return false;
    if (routePickerStatus === "assigned" && !owner) return false;
    if (routePickerStatus === "unassigned" && owner) return false;
    if (routePickerStatus === "eligible" && eligibility !== "available") return false;
    if (routePickerStatus === "blocked" && eligibility !== "assigned-to-other") return false;
    return true;
  });
  const pendingTransferRoute = pendingTransferRouteId
    ? selectedContract?.contractRoutes.find((route) => route.id === pendingTransferRouteId) ?? null
    : null;
  const pendingTransferOwner = pendingTransferRoute && selectedContract
    ? getRouteOwner(pendingTransferRoute.id, selectedContract.tenderId, contracts)
    : null;

  async function refreshContracts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contracts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Contracts could not be loaded");
      setContracts(data.contracts ?? []);
    } catch (err) {
      setError((err as Error).message);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }

  async function patchContract(input: Partial<LivePartnerContract>) {
    if (!selectedContract) return;
    const previousContracts = contracts;
    setContracts((current) =>
      current.map((contract) => (contract.id === selectedContract.id ? { ...contract, ...input } : contract)),
    );
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Contract could not be updated");
      setContracts((current) => current.map((contract) => (contract.id === data.contract.id ? data.contract : contract)));
    } catch (err) {
      setContracts(previousContracts);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function assignRoute(routeId: string) {
    if (!selectedContract) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${selectedContract.id}/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Route could not be assigned");
      await refreshContracts();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function createRoute() {
    if (!selectedContract) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${selectedContract.id}/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: {
            origin: newRouteOrigin,
            destination: newRouteDestination,
            frequencyPerWeek: Number(newRouteFrequency),
            operatingDays: newRouteOperatingDays,
            aircraft: newRouteAircraft,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Route could not be created");
      setNewRouteOrigin("");
      setNewRouteDestination("");
      setNewRouteFrequency("1");
      setNewRouteOperatingDays("");
      setNewRouteAircraft("");
      await refreshContracts();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function unassignRoute(routeId: string) {
    if (!selectedContract) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${selectedContract.id}/routes/${encodeURIComponent(routeId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Route could not be removed");
      await refreshContracts();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="GSA partner workspace" subtitle="Contract-bound route allocation" />
      <main className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Accepted GSAs" value={loading ? "..." : String(contracts.length)} />
          <Metric label="Assigned routes" value={String(assignedRouteCount)} />
          <Metric label="Contract scopes" value={String(new Set(contracts.map((contract) => contract.tenderId)).size)} />
        </div>

        {error && (
          <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {!loading && contracts.length === 0 ? (
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
                      Accepted awards are persisted as partner contracts and can receive targets and route allocations.
                    </p>
                  </div>
                  <Badge variant="muted">{contracts.length} active contract{contracts.length === 1 ? "" : "s"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {contracts.map((contract) => (
                  <PartnerContractCard
                    key={contract.id}
                    partner={buildPartnerProfile(contract)}
                    contract={contract}
                    selected={contract.id === selectedContractId}
                    onSelect={() => setSelectedContractId(contract.id)}
                  />
                ))}
              </CardContent>
            </Card>

            {selectedContract && selectedPartner && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-brand" />
                        Contract controls for {selectedPartner.name}
                      </CardTitle>
                      <p className="mt-1 text-sm text-ink-muted">
                        Set the working conditions first, then assign routes from this awarded tender scope.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/airline/gsa/${selectedPartner.id}`}>Open full profile</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-5">
                    <ContractField label="Contract start">
                      <Input
                        type="date"
                        value={selectedContract.startDate ?? ""}
                        onChange={(event) => patchContract({ startDate: event.target.value })}
                      />
                    </ContractField>
                    <ContractField label="Contract end">
                      <Input
                        type="date"
                        min={selectedContract.startDate}
                        value={selectedContract.endDate ?? ""}
                        onChange={(event) => patchContract({ endDate: event.target.value })}
                      />
                    </ContractField>
                    <ContractField label="Target load factor">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedContract.targetLoadFactor ?? ""}
                        placeholder="82"
                        aria-label="Target load factor percent"
                        onChange={(event) =>
                          patchContract({ targetLoadFactor: event.target.value ? Number(event.target.value) : undefined })
                        }
                      />
                    </ContractField>
                    <ContractField label="Monthly tonnage target">
                      <Input
                        type="number"
                        min={0}
                        value={selectedContract.monthlyTonnageTargetKg ? Math.round(selectedContract.monthlyTonnageTargetKg / 1000) : ""}
                        placeholder="1500"
                        aria-label="Monthly tonnage target in tons"
                        onChange={(event) =>
                          patchContract({ monthlyTonnageTargetKg: event.target.value ? Number(event.target.value) * 1000 : undefined })
                        }
                      />
                    </ContractField>
                    <ContractField label="Commission %">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={selectedContract.commissionRate ?? ""}
                        placeholder="5.0"
                        aria-label="Commission percentage"
                        onChange={(event) =>
                          patchContract({ commissionRate: event.target.value ? Number(event.target.value) : undefined })
                        }
                      />
                    </ContractField>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
                    <ContractField label="Reporting cadence">
                      <Select
                        value={selectedContract.reportingCadence ?? "weekly"}
                        onChange={(event) => patchContract({ reportingCadence: event.target.value })}
                      >
                        <option value="weekly">Weekly sales review</option>
                        <option value="biweekly">Bi-weekly review</option>
                        <option value="monthly">Monthly QBR pack</option>
                      </Select>
                    </ContractField>
                    <div className="rounded-xl border border-border-ui bg-surface2 px-4 py-3 text-sm text-ink-muted">
                      These values define the measurable contract controls used for route assignment, GSA reporting, and performance dashboards.
                    </div>
                  </div>

                  {!hasContractPeriod && (
                    <div className="rounded-lg border border-amber-500/25 bg-warning-bg p-3 text-xs text-warning">
                      Set contract start and end before assigning routes. The assignment is only valid for that contract period.
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-5">
                    <MiniMetric label="Routes" value={String(selectedRoutes.length)} />
                    <MiniMetric label="Weekly frequency" value={`${weeklyFrequency}x`} />
                    <MiniMetric label="Load factor target" value={selectedContract.targetLoadFactor ? `${selectedContract.targetLoadFactor}%` : "-"} />
                    <MiniMetric
                      label="Monthly target"
                      value={selectedContract.monthlyTonnageTargetKg ? `${Math.round(selectedContract.monthlyTonnageTargetKg / 1000)}t` : "-"}
                    />
                    <MiniMetric label="Commission" value={selectedContract.commissionRate != null ? `${selectedContract.commissionRate}%` : "-"} />
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedContract && selectedPartner && (
              <Card>
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Routes for {selectedPartner.name}</CardTitle>
                      <p className="mt-1 text-sm text-ink-muted">
                        Assign existing tender routes or create a route from the global airport catalogue.
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
                          <p className="font-semibold text-ink">Create or assign routes</p>
                          <p className="mt-1 text-sm text-ink-muted">
                            Search worldwide airports to create a new lane, or assign routes already copied from the awarded tender.
                          </p>
                        </div>
                        <Badge variant="muted">{routeCandidates.length} available in picker</Badge>
                      </div>

                      <div className="mt-4 rounded-xl border border-border-ui bg-surface p-4">
                        <p className="text-sm font-semibold text-ink">New route</p>
                        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_120px_160px_160px_auto]">
                          <ContractField label="Origin">
                            <AirportCodePicker
                              value={newRouteOrigin}
                              onChange={setNewRouteOrigin}
                              placeholder="Search origin..."
                              disabled={saving}
                            />
                          </ContractField>
                          <ContractField label="Destination">
                            <AirportCodePicker
                              value={newRouteDestination}
                              onChange={setNewRouteDestination}
                              placeholder="Search destination..."
                              disabled={saving}
                            />
                          </ContractField>
                          <ContractField label="Freq / week">
                            <Input
                              type="number"
                              min={1}
                              max={21}
                              value={newRouteFrequency}
                              onChange={(event) => setNewRouteFrequency(event.target.value)}
                              disabled={saving}
                            />
                          </ContractField>
                          <ContractField label="Operating days">
                            <Input
                              value={newRouteOperatingDays}
                              onChange={(event) => setNewRouteOperatingDays(event.target.value)}
                              placeholder="Mon-Fri"
                              disabled={saving}
                            />
                          </ContractField>
                          <ContractField label="Aircraft">
                            <Input
                              value={newRouteAircraft}
                              onChange={(event) => setNewRouteAircraft(event.target.value)}
                              placeholder="A330F"
                              disabled={saving}
                            />
                          </ContractField>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              disabled={
                                saving ||
                                !hasContractPeriod ||
                                !newRouteOrigin ||
                                !newRouteDestination ||
                                newRouteOrigin === newRouteDestination
                              }
                              onClick={createRoute}
                              className="w-full"
                            >
                              Create
                            </Button>
                          </div>
                        </div>
                        {!hasContractPeriod && (
                          <p className="mt-2 text-xs text-warning">Set contract start and end before creating assigned routes.</p>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_180px_200px]">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                          <Input
                            value={routePickerQuery}
                            onChange={(event) => setRoutePickerQuery(event.target.value)}
                            placeholder="Search all routes..."
                            className="pl-9"
                          />
                        </div>
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
                          <option value="blocked">Blocked</option>
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
                            <th className="pb-3 pr-4 text-left">Operation</th>
                            <th className="pb-3 pr-4 text-left">Frequency</th>
                            <th className="pb-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-ui">
                          {visibleSelectedRoutes.map((route) => (
                            <SelectedRouteRow
                              key={route.id}
                              route={route}
                              market={selectedContract.market}
                              disabled={saving}
                              onUnassign={() => unassignRoute(route.id)}
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
                            <th className="px-4 py-3 text-left">Frequency</th>
                            <th className="px-4 py-3 text-left">Current GSA</th>
                            <th className="px-4 py-3 text-left">Eligibility</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-ui">
                          {routeCandidates.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-muted">
                                No existing tender routes match the current filters. Create a new route above.
                              </td>
                            </tr>
                          ) : routeCandidates.map((route) => {
                            const owner = getRouteOwner(route.id, selectedContract.tenderId, contracts);
                            const eligibility = getEligibility(selectedContract.id, owner?.contract.id ?? null);
                            return (
                              <RouteRow
                                key={route.id}
                                route={route}
                                market={selectedContract.market}
                                owner={owner?.partner ?? null}
                                eligibility={eligibility}
                                canAssign={Boolean(hasContractPeriod && eligibility === "available" && !saving)}
                                canTransfer={Boolean(hasContractPeriod && eligibility === "assigned-to-other" && !saving)}
                                onAssign={() => assignRoute(route.id)}
                                onUnassign={() => unassignRoute(route.id)}
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

            {pendingTransferRoute && selectedContract && selectedPartner && (
              <Card className="border-amber-500/30">
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-ink">Transfer {pendingTransferRoute.id} to {selectedPartner.name}?</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Current owner: {pendingTransferOwner?.partner.name ?? "Unassigned"}. This will remove the route from the current GSA and assign it to the selected contract.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPendingTransferRouteId(null)}>Cancel</Button>
                    <Button
                      disabled={saving}
                      onClick={async () => {
                        await assignRoute(pendingTransferRoute.id);
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
  contract,
  selected,
  onSelect,
}: {
  partner: PartnerProfile;
  contract: LivePartnerContract;
  selected: boolean;
  onSelect: () => void;
}) {
  const assignedRoutesForPartner = contract.contractRoutes.filter((route) => route.status === "assigned");
  const weeklyFrequency = assignedRoutesForPartner.reduce((sum, route) => sum + route.frequencyPerWeek, 0);
  const hasContractPeriod = Boolean(contract.startDate && contract.endDate);

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

      <div className="mt-4 grid grid-cols-4 gap-2">
        <CardMetric label="Routes" value={String(assignedRoutesForPartner.length)} />
        <CardMetric label="Freq." value={`${weeklyFrequency}x`} />
        <CardMetric label="LF target" value={contract.targetLoadFactor ? `${contract.targetLoadFactor}%` : "-"} />
        <CardMetric label="Comm." value={contract.commissionRate != null ? `${contract.commissionRate}%` : "-"} />
      </div>

      <div className="mt-4 grid gap-2 text-xs text-ink-muted">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-brand" />
          {contract.startDate && contract.endDate
            ? `${contract.startDate} to ${contract.endDate}`
            : "No contract period set"}
        </span>
        <span className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-brand" />
          {contract.monthlyTonnageTargetKg
            ? `${Math.round(contract.monthlyTonnageTargetKg / 1000)}t monthly target`
            : "No monthly target set"}
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

function ContractField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function SelectedRouteRow({
  route,
  market,
  disabled,
  onUnassign,
}: {
  route: LiveContractRoute;
  market: string;
  disabled: boolean;
  onUnassign: () => void;
}) {
  return (
    <tr className="align-top text-ink-muted">
      <td className="py-4 pr-4">
        <p className="font-mono font-semibold text-ink">{route.id}</p>
        <p className="mt-1 text-xs text-ink-muted">{route.origin} to {route.destination}</p>
      </td>
      <td className="py-4 pr-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="muted">{market}</Badge>
          {route.aircraft && <Badge variant="muted">{route.aircraft}</Badge>}
        </div>
      </td>
      <td className="py-4 pr-4">
        <p className="font-semibold text-ink">{route.frequencyPerWeek}x weekly</p>
        <p className="text-xs text-ink-muted">{route.operatingDays || route.weekday || "Schedule TBD"}</p>
      </td>
      <td className="py-4 text-right">
        <Button size="sm" variant="outline" disabled={disabled} onClick={onUnassign}>
          Remove
        </Button>
      </td>
    </tr>
  );
}

function RouteRow({
  route,
  market,
  owner,
  eligibility,
  canAssign,
  canTransfer,
  onAssign,
  onUnassign,
  onReviewTransfer,
}: {
  route: LiveContractRoute;
  market: string;
  owner: PartnerProfile | null;
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
      <td className="px-4 py-4">
        <p className="font-mono font-semibold text-ink">{route.id}</p>
        <p className="mt-1 text-xs text-ink-muted">{route.origin} to {route.destination}</p>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="muted">{market}</Badge>
          {route.aircraft && <Badge variant="muted">{route.aircraft}</Badge>}
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="font-semibold text-ink">{route.frequencyPerWeek}x weekly</p>
        <p className="text-xs text-ink-muted">{route.operatingDays || route.weekday || "Schedule TBD"}</p>
      </td>
      <td className="px-4 py-4">
        {owner ? (
          <span className="flex items-center gap-2 text-ink">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: owner.color }} />
            {owner.name}
          </span>
        ) : (
          <span className="text-ink-muted">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-4">
        <EligibilityBadge eligibility={eligibility} />
      </td>
      <td className="px-4 py-4 text-right">
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

function getEligibility(selectedContractId: string, ownerContractId: string | null): RouteEligibility {
  if (ownerContractId === selectedContractId) return "assigned-to-selected";
  if (ownerContractId) return "assigned-to-other";
  return "available";
}

function getRouteOwner(routeId: string, tenderId: string, contracts: LivePartnerContract[]) {
  const contract = contracts.find(
    (item) => item.tenderId === tenderId && item.contractRoutes.some((route) => route.id === routeId && route.status === "assigned"),
  );
  return contract ? { contract, partner: buildPartnerProfile(contract) } : null;
}

function buildPartnerProfile(contract: LivePartnerContract): PartnerProfile {
  return {
    id: contract.gsaId,
    name: contract.gsaName,
    contactName: contract.contactName ?? "GSA contact",
    email: contract.email ?? "",
    headquarters: contract.headquarters ?? "Not provided",
    coverage: contract.coverage ?? [],
    markets: contract.markets ?? [],
    certifications: contract.certifications ?? [],
    cargoFocus: contract.cargoFocus ?? "General cargo",
    color: "#2563EB",
    networkScore: contract.networkScore ?? 50,
    financialScore: contract.financialScore ?? 50,
    complianceScore: contract.complianceScore ?? 50,
    winRate: contract.winRate ?? 0,
    summary: `${contract.gsaName} was accepted for ${contract.market}.`,
  };
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
        {label === "Weekly frequency" ? <PackageCheck className="h-3.5 w-3.5" /> : <Route className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
