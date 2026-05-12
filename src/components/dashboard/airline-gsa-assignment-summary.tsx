"use client";

import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { assignableRoutes } from "@/lib/airline-gsa-workflow";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { applications } from "@/lib/services/platform";
import { useAirlineGsaWorkflow } from "@/lib/use-airline-gsa-workflow";

export function AirlineGsaAssignmentSummary() {
  const workflow = useAirlineGsaWorkflow(applications);
  const acceptedPartners = realGsaPartners.filter((partner) => workflow.state.acceptedGsas[partner.id]);
  const assignedRouteIds = new Set(
    Object.values(workflow.state.acceptedGsas).flatMap((assignment) => assignment.routeIds),
  );
  const assignedRoutes = assignableRoutes.filter((route) => assignedRouteIds.has(route.id));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Accepted GSA route assignments</CardTitle>
          <p className="mt-0.5 text-sm text-ink-muted">
            Accepted applications become active partners here and can be assigned lanes.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/airline/gsa/overview">
            Manage
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {acceptedPartners.length === 0 ? (
          <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">
            No accepted GSAs yet. Accept an application to start assigning routes.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile label="Accepted partners" value={String(acceptedPartners.length)} />
            <SummaryTile label="Assigned routes" value={String(assignedRoutes.length)} />
            <SummaryTile
              label="Weekly assigned capacity"
              value={`${Math.round(assignedRoutes.reduce((sum, route) => sum + route.weeklyCapacityKg, 0) / 1000)}t`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        <Route className="h-4 w-4 text-brand" />
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
