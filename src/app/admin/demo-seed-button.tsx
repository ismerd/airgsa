"use client";

import { useState } from "react";
import { DatabaseZap } from "lucide-react";
import { Button } from "@/components/ui/button";

type SeedResult = {
  tender: { id: string; title: string; status: string };
  contract: { id: string; gsaName: string; assignedRoutes: number };
  quoteIds: string[];
  bookingIds: string[];
  controlActionIds: string[];
  monthlyReportIds: string[];
};

export function DemoSeedButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSeed() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/demo/seed", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Seed failed");
      setResult(payload);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-ink">Workflow seed</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          Creates the full persistent chain from tender award to contract control, booking and report.
        </p>
        {result && (
          <p className="mt-2 text-xs text-emerald-400">
            Ready: {result.contract.gsaName}, {result.contract.assignedRoutes} routes, {result.quoteIds.length} quotes,{" "}
            {result.bookingIds.length} booking, {result.controlActionIds.length} action, {result.monthlyReportIds.length} report.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
      <Button onClick={runSeed} disabled={loading} className="shrink-0">
        <DatabaseZap className="h-4 w-4" />
        {loading ? "Seeding..." : "Run seed"}
      </Button>
    </div>
  );
}
