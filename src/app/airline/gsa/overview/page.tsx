"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, PackageCheck, Route, UsersRound } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assignableRoutes } from "@/lib/airline-gsa-workflow";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { applications } from "@/lib/services/platform";
import { useAirlineGsaWorkflow } from "@/lib/use-airline-gsa-workflow";

export default function AirlineGsaOverviewPage() {
  const workflow = useAirlineGsaWorkflow(applications);
  const acceptedPartners = realGsaPartners.filter((partner) => workflow.state.acceptedGsas[partner.id]);
  const assignedRouteCount = Object.values(workflow.state.acceptedGsas).reduce(
    (sum, assignment) => sum + assignment.routeIds.length,
    0,
  );

  return (
    <>
      <Topbar title="GSA partner workspace" subtitle="Accepted GSAs and route assignment" />
      <main className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Accepted GSAs" value={String(acceptedPartners.length)} />
          <Metric label="Assigned routes" value={String(assignedRouteCount)} />
          <Metric label="Assignable lanes" value={String(assignableRoutes.length)} />
        </div>

        {acceptedPartners.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <UsersRound className="h-10 w-10 text-ink-muted/50" />
              <div>
                <p className="text-lg font-semibold text-ink">No accepted GSAs yet</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Accept a GSA application first. It will appear here immediately for route assignment.
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
          <div className="grid gap-5 xl:grid-cols-2">
            {acceptedPartners.map((partner) => {
              const assignment = workflow.state.acceptedGsas[partner.id];
              const assignedRoutes = assignableRoutes.filter((route) => assignment.routeIds.includes(route.id));
              const routeCapacity = assignedRoutes.reduce((sum, route) => sum + route.weeklyCapacityKg, 0);

              return (
                <Card key={partner.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: partner.color }} />
                          {partner.name}
                        </CardTitle>
                        <p className="mt-1 text-sm text-ink-muted">
                          Accepted {assignment.acceptedAt} · {partner.contactName}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/airline/gsa/${partner.id}`}>Profile</Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MiniMetric label="Routes" value={String(assignment.routeIds.length)} />
                      <MiniMetric label="Weekly capacity" value={`${Math.round(routeCapacity / 1000)}t`} />
                      <MiniMetric label="Markets" value={partner.markets.slice(0, 2).join(", ")} />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Assign routes</p>
                        {assignment.routeIds.length > 0 && (
                          <Badge variant="success">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="grid gap-2">
                        {assignableRoutes.map((route) => {
                          const checked = assignment.routeIds.includes(route.id);
                          return (
                            <label
                              key={route.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                                checked
                                  ? "border-brand bg-brand-light"
                                  : "border-border-ui bg-surface2 hover:border-brand/40"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => workflow.toggleAssignedRoute(partner.id, route.id)}
                                className="h-4 w-4 accent-[var(--brand)]"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-sm font-semibold text-ink">{route.id}</span>
                                  <Badge variant={route.priority === "recovery" ? "warning" : route.priority === "launch" ? "default" : "muted"}>
                                    {route.priority}
                                  </Badge>
                                </span>
                                <span className="mt-1 block text-xs text-ink-muted">
                                  {route.market} · {route.flightType} · {(route.weeklyCapacityKg / 1000).toFixed(0)}t weekly capacity
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
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
        <Route className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
