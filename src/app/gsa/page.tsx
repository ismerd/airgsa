import Link from "next/link";
import type React from "react";
import { AlertTriangle, BellRing, BriefcaseBusiness, Megaphone, PlaneTakeoff, Route, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { canViewTender, isApplicationOwnedByGsa } from "@/lib/auth/permissions";
import { listCampaigns } from "@/lib/services/campaign-store";
import { listCapacityAlerts } from "@/lib/services/capacity-alert-store";
import { listContractPerformance, listWorkflowNotifications } from "@/lib/services/mandate-execution-store";
import { listLiveApplications, listLiveTenders, listRoutesForGsa } from "@/lib/services/tender-workflow-store";

export const dynamic = "force-dynamic";

export default async function GsaOperationsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <>
        <Topbar title="GSA Operations" subtitle="Authentication required" />
        <main className="p-5">
          <Card>
            <CardContent className="p-8 text-sm text-ink-muted">Please log in to open the GSA operations cockpit.</CardContent>
          </Card>
        </main>
      </>
    );
  }

  const [
    tenders,
    applications,
    assignedRoutes,
    alerts,
    campaigns,
    performance,
    notifications,
  ] = await Promise.all([
    listLiveTenders(),
    listLiveApplications(),
    listRoutesForGsa(session),
    listCapacityAlerts(session),
    listCampaigns(session),
    listContractPerformance(session),
    listWorkflowNotifications(session),
  ]);

  const visibleTenders = tenders.filter((tender) => canViewTender(session, tender));
  const ownApplications = applications.filter((application) => isApplicationOwnedByGsa(session, application));
  const appliedTenderIds = new Set(ownApplications.map((application) => application.tenderId));
  const newTenders = visibleTenders.filter((tender) => !appliedTenderIds.has(tender.id));
  const activeAlerts = alerts.filter((alert) => alert.status === "active");
  const partnerCampaigns = campaigns.filter((campaign) => campaign.authorRole === "airline" && campaign.status === "published");
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const atRiskContracts = performance.filter((snapshot) => snapshot.riskLevel !== "green");
  const pendingReports = performance.filter((snapshot) => snapshot.riskReasons.some((reason) => reason.toLowerCase().includes("report")));
  const openCapacityKg = activeAlerts.reduce((sum, alert) => sum + alert.availableKg, 0);

  return (
    <>
      <Topbar title="GSA Operations" subtitle={session.company} />
      <main className="space-y-6 p-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<BellRing className="h-5 w-5" />} label="Unread updates" value={String(unreadNotifications.length)} tone={unreadNotifications.length ? "warning" : "success"} />
          <Metric icon={<Route className="h-5 w-5" />} label="Assigned routes" value={String(assignedRoutes.length)} />
          <Metric icon={<PlaneTakeoff className="h-5 w-5" />} label="Open capacity" value={`${Math.round(openCapacityKg).toLocaleString("en-GB")} kg`} tone={openCapacityKg ? "warning" : "brand"} />
          <Metric icon={<AlertTriangle className="h-5 w-5" />} label="At-risk contracts" value={String(atRiskContracts.length)} tone={atRiskContracts.length ? "danger" : "success"} />
        </section>

        {(unreadNotifications.length > 0 || activeAlerts.length > 0 || atRiskContracts.length > 0) && (
          <section className="grid gap-4 xl:grid-cols-3">
            <ActionPanel
              title="Workflow updates"
              href="/gsa/notifications"
              cta="Open notifications"
              icon={<BellRing className="h-5 w-5 text-brand" />}
              empty="No unread workflow updates."
              items={unreadNotifications.slice(0, 3).map((notification) => ({
                key: notification.id,
                title: notification.title,
                meta: notification.type,
                badge: "Unread",
              }))}
            />
            <ActionPanel
              title="Capacity alerts"
              href="/gsa/capacity-alerts"
              cta="Review capacity"
              icon={<PlaneTakeoff className="h-5 w-5 text-brand" />}
              empty="No active capacity alerts."
              items={activeAlerts.slice(0, 3).map((alert) => ({
                key: alert.id,
                title: alert.message,
                meta: `${alert.availableKg.toLocaleString("en-GB")} kg open - ${alert.sentTo}`,
                badge: alert.urgency,
              }))}
            />
            <ActionPanel
              title="Contract risks"
              href="/gsa/performance"
              cta="Open performance"
              icon={<TrendingUp className="h-5 w-5 text-brand" />}
              empty="No active contract risks."
              items={atRiskContracts.slice(0, 3).map((snapshot) => ({
                key: snapshot.contractId,
                title: `${snapshot.airline} - ${snapshot.market}`,
                meta: snapshot.riskReasons[0] ?? "Risk signal requires review",
                badge: snapshot.riskLevel,
              }))}
            />
          </section>
        )}

        <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-5 w-5 text-brand" />
                  Tender pipeline
                </CardTitle>
                <Button asChild size="sm" variant="outline"><Link href="/gsa">Refresh cockpit</Link></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {newTenders.length > 0 ? newTenders.slice(0, 4).map((tender) => (
                <div key={tender.id} className="flex flex-col gap-3 rounded-lg border border-border-ui bg-surface2 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="success">Open</Badge>
                      <Badge variant="muted">{tender.countryScope || tender.regions.join(", ") || "Market scope"}</Badge>
                    </div>
                    <p className="mt-2 font-semibold text-ink">{tender.title}</p>
                    <p className="mt-1 text-sm text-ink-muted">{tender.airline} - deadline {tender.deadline}</p>
                  </div>
                  <Button asChild size="sm"><Link href={`/gsa/tenders/${tender.id}`}>Open tender</Link></Button>
                </div>
              )) : (
                <div className="rounded-lg border border-border-ui bg-surface2 p-5 text-sm text-ink-muted">
                  No new tender opportunities. Submitted applications: {ownApplications.length}.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-brand" />
                Airline campaigns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {partnerCampaigns.length > 0 ? partnerCampaigns.slice(0, 4).map((campaign) => (
                <div key={campaign.id} className="rounded-lg border border-border-ui bg-surface2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">Published</Badge>
                    <Badge variant="muted">{campaign.type.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-2 font-semibold text-ink">{campaign.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{campaign.body}</p>
                </div>
              )) : (
                <div className="rounded-lg border border-border-ui bg-surface2 p-5 text-sm text-ink-muted">
                  No active airline campaigns for your contracts.
                </div>
              )}
              <Button asChild size="sm" variant="outline"><Link href="/gsa/campaigns">Open campaigns</Link></Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Assigned route worklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignedRoutes.length > 0 ? assignedRoutes.slice(0, 6).map((route) => (
                <div key={`${route.contractId}-${route.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-border-ui bg-surface2 p-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-ink">{route.origin} - {route.destination}</p>
                    <p className="mt-1 text-xs text-ink-muted">{route.airline} - {route.frequencyPerWeek}/week - {route.aircraft ?? "Aircraft TBC"}</p>
                  </div>
                  <Badge variant={route.status === "assigned" ? "success" : "muted"}>{route.status}</Badge>
                </div>
              )) : (
                <div className="rounded-lg border border-border-ui bg-surface2 p-5 text-sm text-ink-muted">
                  No assigned contract routes yet.
                </div>
              )}
              <Button asChild size="sm" variant="outline"><Link href="/gsa/quotes">Create quote</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {performance.length > 0 ? performance.slice(0, 5).map((snapshot) => (
                <div key={snapshot.contractId} className="rounded-lg border border-border-ui bg-surface2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={riskVariant(snapshot.riskLevel)}>{snapshot.riskLevel}</Badge>
                    <Badge variant="muted">{snapshot.market}</Badge>
                  </div>
                  <p className="mt-2 font-semibold text-ink">{snapshot.airline}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Revenue {snapshot.revenueAttainmentPct}% - tonnage {snapshot.tonnageAttainmentPct}% - quotes {snapshot.quoteTargetPct}%
                  </p>
                </div>
              )) : (
                <div className="rounded-lg border border-border-ui bg-surface2 p-5 text-sm text-ink-muted">
                  No active contract performance records yet.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline"><Link href="/gsa/performance">Performance</Link></Button>
                <Button asChild size="sm" variant={pendingReports.length ? "default" : "outline"}><Link href="/gsa/monthly-reports">Monthly reports</Link></Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "brand",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "brand" | "success" | "warning" | "danger";
}) {
  const color =
    tone === "danger" ? "bg-danger-bg text-danger" :
    tone === "warning" ? "bg-warning-bg text-warning" :
    tone === "success" ? "bg-success-bg text-success" :
    "bg-brand-light text-brand";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-semibold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionPanel({
  title,
  href,
  cta,
  icon,
  empty,
  items,
}: {
  title: string;
  href: string;
  cta: string;
  icon: React.ReactNode;
  empty: string;
  items: Array<{ key: string; title: string; meta: string; badge: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? items.map((item) => (
          <div key={item.key} className="rounded-lg border border-border-ui bg-surface2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">{item.badge}</Badge>
              <span className="text-xs text-ink-muted">{item.meta}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold text-ink">{item.title}</p>
          </div>
        )) : (
          <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">{empty}</div>
        )}
        <Button asChild size="sm" variant="outline"><Link href={href}>{cta}</Link></Button>
      </CardContent>
    </Card>
  );
}

function riskVariant(risk: "green" | "amber" | "red"): "success" | "warning" | "danger" {
  if (risk === "green") return "success";
  if (risk === "amber") return "warning";
  return "danger";
}
