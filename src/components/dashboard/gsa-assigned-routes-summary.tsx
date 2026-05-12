"use client";

import { CheckCircle2, Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assignableRoutes } from "@/lib/airline-gsa-workflow";
import { realGsaPartners } from "@/lib/real-gsa-data";
import { applications } from "@/lib/services/platform";
import { useAirlineGsaWorkflow } from "@/lib/use-airline-gsa-workflow";

export function GsaAssignedRoutesSummary({ companyName }: { companyName: string }) {
  const workflow = useAirlineGsaWorkflow(applications);
  const partner = realGsaPartners.find((item) => item.name === companyName) ?? realGsaPartners[0];
  const assignment = workflow.state.acceptedGsas[partner.id];
  const routes = assignableRoutes.filter((route) => assignment?.routeIds.includes(route.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5 text-brand" />
          Assigned Saudia Cargo routes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!assignment ? (
          <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">
            No awarded airline mandate yet. Once the airline accepts this GSA, assigned routes appear here.
          </div>
        ) : routes.length === 0 ? (
          <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">
            Application accepted. Waiting for the airline to assign routes.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {routes.map((route) => (
              <div key={route.id} className="rounded-lg border border-border-ui bg-surface2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-ink">{route.id}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {route.market} · {route.flightType} · {(route.weeklyCapacityKg / 1000).toFixed(0)}t weekly
                    </p>
                  </div>
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    assigned
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
