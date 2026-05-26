import Link from "next/link";
import type React from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CheckSquare2,
  FileSpreadsheet,
  Inbox,
  Megaphone,
  PackageCheck,
  PlaneTakeoff,
  Route,
  TrendingUp,
  Users,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { canViewTender, isApplicationOwnedByGsa } from "@/lib/auth/permissions";
import { listCampaigns } from "@/lib/services/campaign-store";
import { listCapacityAlerts } from "@/lib/services/capacity-alert-store";
import {
  listContractPerformance,
  listControlActions,
  listMandateBookings,
  listMandateQuotes,
  listMonthlyReports,
  listWorkflowNotifications,
  type MandateBooking,
  type MandateQuote,
} from "@/lib/services/mandate-execution-store";
import { listQuoteRoomsForSession, type QuoteRoom } from "@/lib/services/quote-room-store";
import { listLiveApplications, listLiveTenders, listRoutesForGsa } from "@/lib/services/tender-workflow-store";

export const dynamic = "force-dynamic";

type Tone = "brand" | "success" | "warning" | "danger" | "muted";
type Priority = "urgent" | "today" | "watch" | "normal";

type WorkItem = {
  key: string;
  title: string;
  meta: string;
  href: string;
  cta: string;
  priority: Priority;
  icon: React.ReactNode;
};

type CustomerThread = {
  key: string;
  customer: string;
  contact: string;
  latest: string;
  latestAt: string;
  quoteCount: number;
  roomCount: number;
  stateLabel: string;
  stateTone: "success" | "warning" | "default" | "muted" | "danger";
};

type TeamLoad = {
  key: string;
  name: string;
  role: string;
  count: number;
  critical: number;
  nextItem: string;
};

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
    quotes,
    bookings,
    controlActions,
    reports,
    quoteRooms,
  ] = await Promise.all([
    listLiveTenders(),
    listLiveApplications(),
    listRoutesForGsa(session),
    listCapacityAlerts(session),
    listCampaigns(session),
    listContractPerformance(session),
    listWorkflowNotifications(session),
    listMandateQuotes(session),
    listMandateBookings(session),
    listControlActions(session),
    listMonthlyReports(session),
    listQuoteRoomsForSession(session),
  ]);

  const visibleTenders = tenders.filter((tender) => canViewTender(session, tender));
  const ownApplications = applications.filter((application) => isApplicationOwnedByGsa(session, application));
  const appliedTenderIds = new Set(ownApplications.map((application) => application.tenderId));
  const newTenders = visibleTenders.filter((tender) => !appliedTenderIds.has(tender.id));
  const activeAlerts = alerts.filter((alert) => alert.status === "active");
  const partnerCampaigns = campaigns.filter((campaign) => campaign.authorRole === "airline" && campaign.status === "published");
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const atRiskContracts = performance.filter((snapshot) => snapshot.riskLevel !== "green");
  const openActions = controlActions.filter((action) => action.status !== "completed" && action.status !== "cancelled");
  const reportFixes = reports.filter((report) => report.status === "changes-requested");
  const bookingByQuoteId = new Set(bookings.map((booking) => booking.quoteId));
  const quotesToBook = quotes.filter((quote) => (quote.status === "auto-approved" || quote.status === "airline-approved") && !bookingByQuoteId.has(quote.id));
  const customerThreads = buildCustomerThreads(quoteRooms, quotes);
  const activeCustomerThreads = customerThreads.filter((thread) => thread.stateTone !== "success" && thread.stateTone !== "danger");
  const customerThreadsNeedingReply = activeCustomerThreads.filter((thread) => thread.stateTone === "warning");
  const monthBookings = filterCurrentMonth(bookings);
  const monthRevenue = monthBookings.reduce((sum, booking) => sum + booking.revenueAmount, 0);
  const monthWeight = monthBookings.reduce((sum, booking) => sum + booking.weightKg, 0);
  const quoteWinRate = quotes.length > 0 ? Math.round((bookings.length / quotes.length) * 100) : 0;
  const workQueue = buildWorkQueue({
    customerThreadsNeedingReply,
    quotesToBook,
    openActions,
    reportFixes,
    activeAlerts,
    atRiskContracts,
    unreadNotifications,
  });
  const teamLoad = buildTeamLoad({
    customerThreadsNeedingReply,
    quotesToBook,
    openActions,
    reportFixes,
  });

  return (
    <>
      <Topbar title="GSA Operations" subtitle={session.company} />
      <main className="space-y-5 p-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<Inbox className="h-5 w-5" />}
            label="Customer desk"
            value={String(activeCustomerThreads.length)}
            helper={`${customerThreadsNeedingReply.length} need reply`}
            tone={customerThreadsNeedingReply.length ? "warning" : "success"}
          />
          <Metric
            icon={<PackageCheck className="h-5 w-5" />}
            label="Quotes to book"
            value={String(quotesToBook.length)}
            helper="Approved, not booked"
            tone={quotesToBook.length ? "warning" : "success"}
          />
          <Metric
            icon={<TrendingUp className="h-5 w-5" />}
            label="Booked this month"
            value={formatMoney(monthRevenue)}
            helper={`${formatKg(monthWeight)} handled`}
          />
          <Metric
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Operational risk"
            value={String(activeAlerts.length + atRiskContracts.length + openActions.filter((action) => action.severity === "critical").length)}
            helper="Capacity, contract, or airline action"
            tone={activeAlerts.length || atRiskContracts.length ? "danger" : "success"}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare2 className="h-5 w-5 text-brand" />
                    Today&apos;s work queue
                  </CardTitle>
                  <p className="mt-1 text-sm text-ink-muted">Start here. These are the customer, airline, and booking actions that need human attention.</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/gsa/tasks">Open task list</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {workQueue.length > 0 ? (
                workQueue.slice(0, 7).map((item) => <WorkQueueRow key={item.key} item={item} />)
              ) : (
                <EmptyState title="No urgent work right now" body="New customer replies, approved quotes, airline actions, and report fixes will appear here first." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand" />
                Month control
              </CardTitle>
              <p className="text-sm text-ink-muted">Compact business picture without making the team hunt through KPI pages.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <ControlStat label="Revenue" value={formatMoney(monthRevenue)} helper="Booked this month" />
                <ControlStat label="Tonnage" value={formatKg(monthWeight)} helper={`${monthBookings.length} shipment${monthBookings.length === 1 ? "" : "s"}`} />
                <ControlStat label="Quote win rate" value={`${quoteWinRate}%`} helper={`${bookings.length} bookings from ${quotes.length} quotes`} />
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/gsa/performance">Open performance</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-brand" />
                    Customer conversations
                  </CardTitle>
                  <p className="mt-1 text-sm text-ink-muted">One row per forwarder or customer email. Reply and quote work should start here.</p>
                </div>
                <Button asChild size="sm">
                  <Link href="/gsa/quotes">Open quote inbox</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeCustomerThreads.length > 0 ? (
                activeCustomerThreads.slice(0, 5).map((thread) => <CustomerThreadRow key={thread.key} thread={thread} />)
              ) : (
                <EmptyState title="No active customer threads" body="Imported emails, created quote rooms, and customer replies will show here." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand" />
                Team workload
              </CardTitle>
              <p className="text-sm text-ink-muted">Uses actual assignees where available. Unassigned work stays visible instead of disappearing.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamLoad.length > 0 ? (
                teamLoad.map((owner) => (
                  <div key={owner.key} className="rounded-lg border border-border-ui bg-surface2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{owner.name}</p>
                        <p className="text-xs text-ink-muted">{owner.role}</p>
                      </div>
                      <Badge variant={owner.critical ? "warning" : "muted"}>{owner.count} open</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{owner.nextItem}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No assigned workload" body="Assign airline actions or reports to see employee workload here." />
              )}
              <Button asChild size="sm" variant="outline">
                <Link href="/gsa/team">Team &amp; access</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5 text-brand" />
                    Route and shipment work
                  </CardTitle>
                  <p className="mt-1 text-sm text-ink-muted">Assigned contract lanes and booked AWBs, kept below customer work because they are execution context.</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/gsa/shipments">Open shipments</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignedRoutes.slice(0, 4).map((route) => (
                <div key={`${route.contractId}-${route.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-border-ui bg-surface2 p-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-ink">{route.origin} - {route.destination}</p>
                    <p className="mt-1 text-xs text-ink-muted">{route.airline} - {route.frequencyPerWeek}/week - {route.aircraft ?? "Aircraft TBC"}</p>
                  </div>
                  <Badge variant={route.status === "assigned" ? "success" : "muted"}>{route.status}</Badge>
                </div>
              ))}
              {assignedRoutes.length === 0 && <EmptyState title="No assigned routes" body="Awarded airline contracts can add route assignments later. Customer quotes can still be created from contract scope." />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-brand" />
                Risks that can hurt revenue
              </CardTitle>
              <p className="text-sm text-ink-muted">Only the signals that require a decision or follow-up.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAlerts.slice(0, 2).map((alert) => (
                <RiskRow key={alert.id} label={alert.urgency} title={alert.message} meta={`${formatKg(alert.availableKg)} open - ${alert.sentTo}`} href="/gsa/capacity-alerts" />
              ))}
              {atRiskContracts.slice(0, 3).map((snapshot) => (
                <RiskRow key={snapshot.contractId} label={snapshot.riskLevel} title={`${snapshot.airline} - ${snapshot.market}`} meta={snapshot.riskReasons[0] ?? "Performance below target"} href="/gsa/performance" />
              ))}
              {activeAlerts.length === 0 && atRiskContracts.length === 0 && <EmptyState title="No active risks" body="Capacity shortfalls and contract performance warnings will appear here." />}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <GrowthPanel title="Growth opportunities" icon={<BriefcaseBusiness className="h-5 w-5 text-brand" />} href="/gsa/tenders" cta="Open tender pipeline">
            {newTenders.length > 0 ? (
              newTenders.slice(0, 3).map((tender) => (
                <Link key={tender.id} href={`/gsa/tenders/${tender.id}`} className="block rounded-lg border border-border-ui bg-surface2 p-4 transition hover:border-brand/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">Open</Badge>
                    <Badge variant="muted">{tender.countryScope || tender.regions.join(", ") || "Market scope"}</Badge>
                  </div>
                  <p className="mt-2 font-semibold text-ink">{tender.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{tender.airline} - deadline {tender.deadline}</p>
                </Link>
              ))
            ) : (
              <EmptyState title="No new tenders" body={`Submitted applications: ${ownApplications.length}. New airline opportunities stay here, away from the daily queue.`} />
            )}
          </GrowthPanel>

          <GrowthPanel title="Airline campaigns" icon={<Megaphone className="h-5 w-5 text-brand" />} href="/gsa/campaigns" cta="Open campaigns">
            {partnerCampaigns.length > 0 ? (
              partnerCampaigns.slice(0, 3).map((campaign) => (
                <div key={campaign.id} className="rounded-lg border border-border-ui bg-surface2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">Published</Badge>
                    <Badge variant="muted">{campaign.type.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-2 font-semibold text-ink">{campaign.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{campaign.body}</p>
                </div>
              ))
            ) : (
              <EmptyState title="No active campaigns" body="Airline campaign material stays secondary unless it creates a task or customer conversation." />
            )}
          </GrowthPanel>
        </section>
      </main>
    </>
  );
}

function Metric({ icon, label, value, helper, tone = "brand" }: { icon: React.ReactNode; label: string; value: string; helper: string; tone?: Tone }) {
  return (
    <Card>
      <CardContent className="flex h-full items-center gap-3 p-4">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneClass(tone)}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
          <p className="mt-1 truncate text-xs text-ink-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkQueueRow({ item }: { item: WorkItem }) {
  return (
    <Link href={item.href} className="flex items-center gap-3 rounded-lg border border-border-ui bg-surface2 p-4 transition hover:border-brand/40 hover:bg-brand-light/40">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${priorityClass(item.priority)}`}>{item.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={priorityVariant(item.priority)}>{priorityLabel(item.priority)}</Badge>
          <span className="truncate text-xs text-ink-muted">{item.meta}</span>
        </div>
        <p className="mt-1 line-clamp-2 font-semibold text-ink">{item.title}</p>
      </div>
      <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand md:inline-flex">
        {item.cta}
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function CustomerThreadRow({ thread }: { thread: CustomerThread }) {
  return (
    <Link href="/gsa/quotes" className="block rounded-lg border border-border-ui bg-surface2 p-4 transition hover:border-brand/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{thread.customer}</p>
          <p className="truncate text-sm text-ink-muted">{thread.contact || "No contact"} - {formatDateTime(thread.latestAt)}</p>
        </div>
        <Badge variant={threadStateVariant(thread.stateTone)}>{thread.stateLabel}</Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{thread.latest}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="muted">{thread.quoteCount} quote{thread.quoteCount === 1 ? "" : "s"}</Badge>
        <Badge variant="muted">{thread.roomCount} room{thread.roomCount === 1 ? "" : "s"}</Badge>
      </div>
    </Link>
  );
}

function ControlStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{helper}</p>
    </div>
  );
}

function RiskRow({ label, title, meta, href }: { label: string; title: string; meta: string; href: string }) {
  return (
    <Link href={href} className="block rounded-lg border border-warning/25 bg-warning-bg p-4 transition hover:border-warning/50">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning">{label}</Badge>
        <span className="text-xs text-warning">{meta}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-ink">{title}</p>
    </Link>
  );
}

function GrowthPanel({
  title,
  icon,
  href,
  cta,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">Secondary pipeline, kept separate from today&apos;s operational work.</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={href}>{cta}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-ui bg-surface2 p-5 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-ink-muted">{body}</p>
    </div>
  );
}

function buildWorkQueue({
  customerThreadsNeedingReply,
  quotesToBook,
  openActions,
  reportFixes,
  activeAlerts,
  atRiskContracts,
  unreadNotifications,
}: {
  customerThreadsNeedingReply: CustomerThread[];
  quotesToBook: MandateQuote[];
  openActions: Awaited<ReturnType<typeof listControlActions>>;
  reportFixes: Awaited<ReturnType<typeof listMonthlyReports>>;
  activeAlerts: Awaited<ReturnType<typeof listCapacityAlerts>>;
  atRiskContracts: Awaited<ReturnType<typeof listContractPerformance>>;
  unreadNotifications: Awaited<ReturnType<typeof listWorkflowNotifications>>;
}) {
  const items: WorkItem[] = [];

  for (const thread of customerThreadsNeedingReply.slice(0, 3)) {
    items.push({
      key: `thread-${thread.key}`,
      title: `${thread.customer} replied in a quote room`,
      meta: thread.latest,
      href: "/gsa/quotes",
      cta: "Reply",
      priority: "urgent",
      icon: <Inbox className="h-5 w-5" />,
    });
  }

  for (const quote of quotesToBook.slice(0, 3)) {
    items.push({
      key: `quote-${quote.id}`,
      title: `Book ${quote.origin}-${quote.destination} for ${quote.customer}`,
      meta: `${formatKg(quote.weightKg)} - EUR ${quote.requestedRatePerKg.toFixed(2)}/kg - flight ${quote.flightDate}`,
      href: "/gsa/quotes",
      cta: "Book",
      priority: "today",
      icon: <PackageCheck className="h-5 w-5" />,
    });
  }

  for (const action of openActions.slice(0, 3)) {
    items.push({
      key: `action-${action.id}`,
      title: action.title,
      meta: `${action.airline} - due ${action.dueDate ?? "not set"}`,
      href: "/gsa/tasks",
      cta: "Resolve",
      priority: action.severity === "critical" ? "urgent" : "today",
      icon: <CheckSquare2 className="h-5 w-5" />,
    });
  }

  for (const report of reportFixes.slice(0, 2)) {
    items.push({
      key: `report-${report.id}`,
      title: `Fix monthly report for ${report.airline}`,
      meta: report.airlineReviewNote ?? report.period,
      href: "/gsa/monthly-reports",
      cta: "Update",
      priority: "today",
      icon: <FileSpreadsheet className="h-5 w-5" />,
    });
  }

  for (const alert of activeAlerts.slice(0, 2)) {
    items.push({
      key: `alert-${alert.id}`,
      title: alert.message,
      meta: `${formatKg(alert.availableKg)} open - ${alert.sentTo}`,
      href: "/gsa/capacity-alerts",
      cta: "Review",
      priority: alert.urgency === "urgent" ? "urgent" : "watch",
      icon: <PlaneTakeoff className="h-5 w-5" />,
    });
  }

  for (const snapshot of atRiskContracts.slice(0, 2)) {
    items.push({
      key: `risk-${snapshot.contractId}`,
      title: `${snapshot.airline} - ${snapshot.market} is below target`,
      meta: snapshot.riskReasons[0] ?? `${snapshot.market} needs attention`,
      href: "/gsa/performance",
      cta: "Open",
      priority: snapshot.riskLevel === "red" ? "urgent" : "watch",
      icon: <TrendingUp className="h-5 w-5" />,
    });
  }

  if (items.length === 0) {
    for (const notification of unreadNotifications.slice(0, 2)) {
      items.push({
        key: `notification-${notification.id}`,
        title: notification.title,
        meta: notification.body,
        href: notification.href,
        cta: "Open",
        priority: "normal",
        icon: <BellRing className="h-5 w-5" />,
      });
    }
  }

  return items.sort((left, right) => priorityScore(left.priority) - priorityScore(right.priority));
}

function buildCustomerThreads(rooms: QuoteRoom[], quotes: MandateQuote[]): CustomerThread[] {
  const groups = new Map<string, { customer: string; contact: string; rooms: QuoteRoom[]; quotes: MandateQuote[] }>();

  function ensure(customer: string, contact: string, email: string | undefined, fallback: string) {
    const key = email?.trim().toLowerCase() || customer.trim().toLowerCase() || fallback;
    const existing = groups.get(key);
    if (existing) return existing;
    const group = { customer: customer || "Unknown customer", contact, rooms: [] as QuoteRoom[], quotes: [] as MandateQuote[] };
    groups.set(key, group);
    return group;
  }

  for (const room of rooms) {
    ensure(room.customer, displayContact(room.contactName, room.contactEmail), room.contactEmail, room.id).rooms.push(room);
  }
  for (const quote of quotes) {
    ensure(quote.customer, displayContact(quote.contactName, quote.contactEmail), quote.contactEmail, quote.id).quotes.push(quote);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const latestMessage = group.rooms.flatMap((room) => room.messages).sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt))[0];
      const latestAt = newestDate([
        latestMessage?.createdAt,
        ...group.rooms.map((room) => room.lastMessageAt),
        ...group.quotes.map((quote) => quote.updatedAt),
      ]);
      const roomState = group.rooms.map(getRoomState).sort((left, right) => stateScore(right.tone) - stateScore(left.tone))[0];
      const fallbackState = getQuoteGroupState(group.quotes);
      const state = roomState ?? fallbackState;
      return {
        key,
        customer: group.customer,
        contact: group.contact,
        latest: latestMessage?.body ?? `${group.quotes.length} quote${group.quotes.length === 1 ? "" : "s"} in this thread`,
        latestAt,
        quoteCount: group.quotes.length,
        roomCount: group.rooms.length,
        stateLabel: state.label,
        stateTone: state.tone,
      };
    })
    .sort((left, right) => stateScore(right.stateTone) - stateScore(left.stateTone) || safeTime(right.latestAt) - safeTime(left.latestAt));
}

function buildTeamLoad({
  customerThreadsNeedingReply,
  quotesToBook,
  openActions,
  reportFixes,
}: {
  customerThreadsNeedingReply: CustomerThread[];
  quotesToBook: MandateQuote[];
  openActions: Awaited<ReturnType<typeof listControlActions>>;
  reportFixes: Awaited<ReturnType<typeof listMonthlyReports>>;
}) {
  const owners = new Map<string, TeamLoad>();

  function add(name: string, role: string, title: string, critical = false) {
    const key = name.toLowerCase();
    const owner = owners.get(key) ?? { key, name, role, count: 0, critical: 0, nextItem: title };
    owner.count += 1;
    if (critical) owner.critical += 1;
    if (!owner.nextItem) owner.nextItem = title;
    owners.set(key, owner);
  }

  for (const action of openActions) add(action.assigneeName || "Unassigned airline action", "Control action", action.title, action.severity === "critical");
  for (const report of reportFixes) add(report.ownerName || "Unassigned report owner", "Monthly reporting", `${report.airline} ${report.period}`, true);
  if (customerThreadsNeedingReply.length > 0) add("Customer desk", "Quote replies", `${customerThreadsNeedingReply.length} customer thread${customerThreadsNeedingReply.length === 1 ? "" : "s"} need reply`, true);
  if (quotesToBook.length > 0) add("Booking desk", "Booking follow-up", `${quotesToBook.length} approved quote${quotesToBook.length === 1 ? "" : "s"} to book`);

  return [...owners.values()].sort((left, right) => right.critical - left.critical || right.count - left.count);
}

function getRoomState(room: QuoteRoom): { label: string; tone: CustomerThread["stateTone"] } {
  if (room.status === "accepted") return { label: "Accepted", tone: "success" };
  if (room.status === "rejected" || room.status === "closed") return { label: "Closed", tone: "danger" };
  const latest = room.messages.sort((left, right) => safeTime(right.createdAt) - safeTime(left.createdAt))[0];
  if (latest?.actor === "customer") return { label: "Needs reply", tone: "warning" };
  if (room.offers.some((offer) => offer.status === "sent")) return { label: "Waiting on customer", tone: "default" };
  return { label: "Room ready", tone: "muted" };
}

function getQuoteGroupState(quotes: MandateQuote[]): { label: string; tone: CustomerThread["stateTone"] } {
  if (quotes.length === 0) return { label: "No quotes", tone: "muted" };
  if (quotes.some((quote) => quote.status === "airline-approved" || quote.status === "auto-approved")) return { label: "Ready to book", tone: "warning" };
  if (quotes.some((quote) => quote.status === "airline-approval-required")) return { label: "Airline approval", tone: "default" };
  if (quotes.every((quote) => quote.status === "declined" || quote.status === "expired" || quote.status === "airline-rejected")) return { label: "Closed", tone: "danger" };
  return { label: "Quote open", tone: "muted" };
}

function filterCurrentMonth(bookings: MandateBooking[]) {
  const now = new Date();
  return bookings.filter((booking) => {
    const time = new Date(booking.createdAt);
    return time.getFullYear() === now.getFullYear() && time.getMonth() === now.getMonth();
  });
}

function displayContact(name?: string, email?: string) {
  return [name, email].filter(Boolean).join(" - ");
}

function newestDate(values: Array<string | undefined>) {
  const latest = values.map((value) => (value ? safeTime(value) : 0)).filter((value) => Number.isFinite(value)).sort((a, b) => b - a)[0];
  return latest ? new Date(latest).toISOString() : new Date(0).toISOString();
}

function safeTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatMoney(value: number) {
  return `EUR ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function formatKg(value: number) {
  return `${Math.round(value).toLocaleString("en-GB")} kg`;
}

function formatDateTime(value: string) {
  if (safeTime(value) <= 0) return "No date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function toneClass(tone: Tone) {
  if (tone === "danger") return "bg-danger-bg text-danger";
  if (tone === "warning") return "bg-warning-bg text-warning";
  if (tone === "success") return "bg-success-bg text-success";
  if (tone === "muted") return "bg-surface2 text-ink-muted";
  return "bg-brand-light text-brand";
}

function priorityClass(priority: Priority) {
  if (priority === "urgent") return "bg-danger-bg text-danger";
  if (priority === "today") return "bg-warning-bg text-warning";
  if (priority === "watch") return "bg-brand-light text-brand";
  return "bg-surface text-ink-muted";
}

function priorityVariant(priority: Priority): "danger" | "warning" | "default" | "muted" {
  if (priority === "urgent") return "danger";
  if (priority === "today") return "warning";
  if (priority === "watch") return "default";
  return "muted";
}

function priorityLabel(priority: Priority) {
  if (priority === "urgent") return "Do now";
  if (priority === "today") return "Today";
  if (priority === "watch") return "Watch";
  return "Info";
}

function priorityScore(priority: Priority) {
  if (priority === "urgent") return 0;
  if (priority === "today") return 1;
  if (priority === "watch") return 2;
  return 3;
}

function stateScore(tone: CustomerThread["stateTone"]) {
  if (tone === "warning") return 5;
  if (tone === "default") return 4;
  if (tone === "muted") return 3;
  if (tone === "success") return 2;
  return 1;
}

function threadStateVariant(tone: CustomerThread["stateTone"]): "success" | "warning" | "default" | "muted" | "danger" {
  if (tone === "success") return "success";
  if (tone === "warning") return "warning";
  if (tone === "danger") return "danger";
  if (tone === "muted") return "muted";
  return "default";
}
