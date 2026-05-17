"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LivePartnerContract } from "@/lib/services/tender-workflow-store";

export function AirlineGsaAssignmentSummary() {
  const [contracts, setContracts] = useState<LivePartnerContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/contracts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { contracts: [] }))
      .then((data) => {
        if (active) setContracts(data.contracts ?? []);
      })
      .catch(() => {
        if (active) setContracts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const assignedRoutes = contracts.flatMap((contract) =>
    contract.contractRoutes.filter((route) => route.status === "assigned"),
  );
  const weeklyFrequency = assignedRoutes.reduce((sum, route) => sum + route.frequencyPerWeek, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Accepted GSA route assignments</CardTitle>
          <p className="mt-0.5 text-sm text-ink-muted">
            Accepted applications become persistent contracts and assigned tender routes.
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
        {!loading && contracts.length === 0 ? (
          <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">
            No accepted GSAs yet. Accept an application to start assigning routes.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile label="Accepted contracts" value={loading ? "..." : String(contracts.length)} />
            <SummaryTile label="Assigned routes" value={String(assignedRoutes.length)} />
            <SummaryTile label="Weekly frequency" value={`${weeklyFrequency}x`} />
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
