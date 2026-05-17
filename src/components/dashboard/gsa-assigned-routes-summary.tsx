"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LiveGsaAssignedRoute } from "@/lib/services/tender-workflow-store";

export function GsaAssignedRoutesSummary({ companyName }: { companyName: string }) {
  const [routes, setRoutes] = useState<LiveGsaAssignedRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/gsa/routes", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { routes: [] }))
      .then((data) => {
        if (active) setRoutes(data.routes ?? []);
      })
      .catch(() => {
        if (active) setRoutes([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5 text-brand" />
          Assigned airline routes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">
            Loading assigned routes for {companyName}...
          </div>
        ) : routes.length === 0 ? (
          <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">
            No assigned routes yet. Once an airline assigns routes to an accepted contract, they appear here.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {routes.map((route) => (
              <div key={`${route.contractId}-${route.id}`} className="rounded-lg border border-border-ui bg-surface2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-ink">{route.id}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {route.origin} to {route.destination} - {route.frequencyPerWeek}x weekly
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">{route.airline}</p>
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
