"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, PlaneTakeoff } from "lucide-react";
import { DocumentList } from "@/components/dashboard/document-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";
import type { LiveTender, LiveTenderApplication } from "@/lib/services/tender-workflow-store";

export function GsaTenderDetailClient({ tenderId }: { tenderId: string }) {
  const [tender, setTender] = useState<LiveTender | null>(null);
  const [application, setApplication] = useState<LiveTenderApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchJson(url: string) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} failed with ${res.status}`);
      return res.json();
    }

    setLoading(true);
    Promise.all([fetchJson(`/api/tenders/${tenderId}`), fetchJson("/api/applications")])
      .then(([tenderData, applicationData]) => {
        if (!active) return;
        setTender(tenderData.tender);
        setApplication((applicationData.applications ?? []).find((item: LiveTenderApplication) => item.tenderId === tenderId) ?? null);
      })
      .catch(() => {
        if (active) setTender(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenderId]);

  if (loading) {
    return (
      <>
        <Topbar title="Tender detail" subtitle="GSA application" />
        <main className="p-5 text-sm text-ink-muted">Loading tender...</main>
      </>
    );
  }

  if (!tender) {
    return (
      <>
        <Topbar title="Tender not found" subtitle="GSA application" />
        <main className="p-5">
          <Card>
            <CardContent className="p-8 text-sm text-ink-muted">This tender is no longer available.</CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title={tender.title} subtitle="Tender detail" />
      <main className="grid gap-5 p-5 xl:grid-cols-[1fr_.55fr]">
        <Card>
          <CardHeader>
            <CardTitle>{tender.airline}</CardTitle>
            <p className="text-sm text-ink-muted">{tender.countryScope || tender.lanes}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <Info label="Annual tonnage" value={tender.annualTonnage ? tender.annualTonnage.toLocaleString() : "Not stated"} />
              <Info label="Expected start" value={tender.expectedStart || "Not stated"} />
              <Info label="Deadline" value={tender.deadline || "Not stated"} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Markets</p>
              <div className="flex flex-wrap gap-2">
                {tender.regions.map((region) => <Badge key={region}>{region}</Badge>)}
              </div>
            </div>
            {tender.routes.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Route schedule</p>
                <div className="overflow-hidden rounded-lg border border-border-ui">
                  <table className="w-full text-sm">
                    <thead className="bg-surface2 text-xs uppercase text-ink-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Route</th>
                        <th className="px-3 py-2 text-left">Weekly frequency</th>
                        <th className="px-3 py-2 text-left">Operating days</th>
                        <th className="px-3 py-2 text-left">Aircraft / notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-ui">
                      {tender.routes.map((route) => (
                        <tr key={route.id}>
                          <td className="px-3 py-2 font-mono text-ink">{route.origin}-{route.destination}</td>
                          <td className="px-3 py-2 text-ink-muted">{route.frequencyPerWeek}x</td>
                          <td className="px-3 py-2 text-ink-muted">{route.operatingDays || route.weekday || "Not stated"}</td>
                          <td className="px-3 py-2 text-ink-muted">{route.aircraft || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Requirements</p>
              <ul className="space-y-2 text-sm text-ink-muted">
                {tender.requirements.map((item) => <li key={item} className="rounded-md bg-surface2 p-3">{item}</li>)}
              </ul>
            </div>
            {tender.attachments.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Airline attachments</p>
                <DocumentList documents={tender.attachments} />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-surface2 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <PlaneTakeoff className="h-4 w-4 text-brand" />
                {tender.status === "open" ? "Tender is live" : "Tender is not open"}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                <CalendarDays className="h-4 w-4" />
                Deadline {tender.deadline || "not stated"}
              </p>
            </div>
            <p className="text-sm leading-6 text-ink-muted">
              Your company profile will be attached automatically. Add commercial terms, network plan, readiness notes, and documents on the next step.
            </p>
            <Button asChild className="w-full" disabled={tender.status !== "open"}>
              <Link href={`/gsa/tenders/${tender.id}/apply`}>
                {application ? "View application" : "Apply to tender"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-ui bg-surface2 p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
