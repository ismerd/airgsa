"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, CalendarDays, CheckCircle2, ClipboardList, PlaneTakeoff, ShieldCheck, Target, type LucideIcon } from "lucide-react";
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
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Mandate type" value={getMandateLabel(tender)} helper="This defines what the airline expects the GSA to own." />
              <Info label="Coverage model" value={getCoverageLabel(tender)} helper="This explains whether the tender is market-wide, airport-led, route-led, or regional." />
              <Info label="Award structure" value={getAwardLabel(tender)} helper={getAwardHelper(tender)} />
              <Info label="Commercial model" value={getCommercialLabel(tender)} helper={getCommercialHelper(tender)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Info label="Target load factor" value={tender.targetLoadFactor ? `${tender.targetLoadFactor}%` : "Not stated"} />
              <Info label="Commission target" value={tender.commissionRate ? `${tender.commissionRate}%` : "Not stated"} />
              <Info label="Reporting cadence" value={getReportingLabel(tender)} />
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
            <RequirementOverview tender={tender} />
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
              Your company profile will be attached automatically. Add the commercial proposal, account coverage, launch plan, readiness notes,
              and documents that match this tender model.
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

function RequirementOverview({ tender }: { tender: LiveTender }) {
  const groups = buildRequirementGroups(tender);
  const totalItems = groups.reduce((count, group) => count + group.items.length, 0);

  if (totalItems === 0) {
    return (
      <section className="rounded-xl border border-border-ui bg-surface2 p-4">
        <p className="text-sm font-semibold text-ink">What the airline needs</p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">No structured requirements were provided for this tender yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border-ui bg-surface2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">What the airline needs</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            Scan the mandatory proof points before preparing your application.
          </p>
        </div>
        <Badge>{totalItems} requirement{totalItems === 1 ? "" : "s"}</Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {groups.map((group) => (
          <RequirementGroupCard key={group.title} group={group} />
        ))}
      </div>
    </section>
  );
}

type RequirementGroup = {
  title: string;
  helper: string;
  items: string[];
  Icon: LucideIcon;
  display: "chips" | "cards";
};

function RequirementGroupCard({ group }: { group: RequirementGroup }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface p-3">
      <div className="flex items-start gap-2">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
          <group.Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{group.title}</p>
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">{group.helper}</p>
        </div>
      </div>

      {group.display === "chips" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {group.items.map((item) => (
            <Badge key={item}>{item}</Badge>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {group.items.map((item) => (
            <p key={item} className="rounded-md bg-surface2 px-3 py-2 text-sm leading-6 text-ink-muted">
              {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-md border border-border-ui bg-surface2 p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
      {helper && <p className="mt-2 text-xs leading-5 text-ink-muted">{helper}</p>}
    </div>
  );
}

function buildRequirementGroups(tender: LiveTender): RequirementGroup[] {
  const capabilities = uniqueList([
    ...(tender.requiredCapabilities ?? []),
    ...extractRequirementItems(tender.requirements, "Capability"),
  ]);
  const certifications = uniqueList(extractRequirementItems(tender.requirements, "Certification"));
  const experience = mergeRequirementFragments(extractRequirementItems(tender.requirements, "Experience"));
  const commercial = parseCommercialRequirementItems(tender.commercialExpectations);
  const operational = parseOperationalNoteItems(tender.commercialExpectations);

  const groups: RequirementGroup[] = [
    {
      title: "Mandatory capabilities",
      helper: "Capabilities the airline expects every serious applicant to cover.",
      items: capabilities,
      Icon: CheckCircle2,
      display: "chips",
    },
    {
      title: "Experience proof",
      helper: "Evidence your application should make clear.",
      items: experience,
      Icon: Award,
      display: "cards",
    },
    {
      title: "Certifications",
      helper: "Compliance or accreditation points requested by the airline.",
      items: certifications,
      Icon: ShieldCheck,
      display: "chips",
    },
    {
      title: "Commercial commitments",
      helper: "Sales, pipeline, and reporting commitments expected in the proposal.",
      items: commercial,
      Icon: Target,
      display: "chips",
    },
    {
      title: "Operational guardrails",
      helper: "Important operational constraints or launch conditions.",
      items: operational,
      Icon: ClipboardList,
      display: "chips",
    },
  ];

  return groups.filter((group) => group.items.length > 0);
}

function extractRequirementItems(requirements: string[], prefix: string) {
  const matcher = new RegExp(`^${prefix}:\\s*`, "i");
  return requirements
    .filter((item) => matcher.test(item))
    .map((item) => cleanRequirementText(item.replace(matcher, "")))
    .filter(Boolean);
}

function mergeRequirementFragments(items: string[]) {
  const cleaned = items.map(cleanRequirementText).filter(Boolean);
  if (cleaned.length <= 3) return cleaned;

  return [cleaned.join(", ").replace(/\s+/g, " ").replace(/\s+,/g, ",")];
}

function parseCommercialRequirementItems(expectations: string) {
  return parseExpectationLines(expectations)
    .filter((line) => !/^(coverage model|commercial model|target commission|target load factor|monthly revenue target|reporting cadence|contract duration|additional notes):/i.test(line))
    .flatMap(splitDisplayList)
    .map(cleanRequirementText)
    .filter(Boolean);
}

function parseOperationalNoteItems(expectations: string) {
  return parseExpectationLines(expectations)
    .filter((line) => /^additional notes:/i.test(line))
    .flatMap((line) => splitDisplayList(line.replace(/^additional notes:\s*/i, "")))
    .map(cleanRequirementText)
    .filter(Boolean);
}

function parseExpectationLines(expectations: string) {
  return expectations
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitDisplayList(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanRequirementText(value: string) {
  return value
    .replace(/^required experience:\s*/i, "")
    .replace(/^required certification:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueList(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getAwardLabel(tender: LiveTender) {
  if (tender.awardMode === "multi") return `${Math.max(2, tender.maxAwards ?? 2)} possible GSA awards`;
  return "Exclusive single-GSA award";
}

function getAwardHelper(tender: LiveTender) {
  if (tender.awardMode === "multi") return "The airline may select more than one GSA for this mandate.";
  return "The airline expects to select one GSA; once awarded, the tender is effectively closed.";
}

function getCommercialLabel(tender: LiveTender) {
  const model = tender.commercialModel ?? "commission";
  if (model === "capacity-risk") return "Capacity-risk mandate";
  if (model === "hybrid") return "Hybrid commission and upside";
  return "Commission bid";
}

function getCommercialHelper(tender: LiveTender) {
  const model = tender.commercialModel ?? "commission";
  if (model === "capacity-risk") return "The airline wants proof that you can sell allocated capacity profitably.";
  if (model === "hybrid") return "Your proposal should combine base terms with target-based upside.";
  return "Your proposal should make commission terms and sales execution clear.";
}

function getMandateLabel(tender: LiveTender) {
  if (tender.mandateType === "sales-only") return "Sales-only representation";
  if (tender.mandateType === "route-launch") return "Route launch";
  if (tender.mandateType === "product-specialist") return "Product specialist";
  if (tender.mandateType === "regional-cluster") return "Regional cluster";
  return "Full GSA mandate";
}

function getCoverageLabel(tender: LiveTender) {
  if (tender.coverageModel === "airport-led") return "Airport-led";
  if (tender.coverageModel === "route-led") return "Route-led";
  if (tender.coverageModel === "regional-cluster") return "Regional cluster";
  return "Country-wide";
}

function getReportingLabel(tender: LiveTender) {
  if (tender.reportingCadence === "biweekly") return "Biweekly pipeline review";
  if (tender.reportingCadence === "monthly") return "Monthly business review";
  if (tender.reportingCadence === "quarterly") return "Quarterly steering review";
  return "Weekly sales review";
}
