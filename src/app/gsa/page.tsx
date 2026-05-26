import Link from "next/link";
import type React from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  CheckSquare2,
  Clock3,
  FileSpreadsheet,
  Inbox,
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

type TeamCompletion = {
  key: string;
  name: string;
  count: number;
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

  const canInspectTeam = canViewGsaTeam(session);
  const [
    tenders,
    applications,
    assignedRoutes,
    alerts,
    performance,
    notifications,
    quotes,
    bookings,
    controlActions,
    reports,
    quoteRooms,
  ] = await Promise.all([
    canInspectTeam ? listLiveTenders() : Promise.resolve([]),
    canInspectTeam ? listLiveApplications() : Promise.resolve([]),
    listRoutesForGsa(session),
    listCapacityAlerts(session),
    canInspectTeam ? listContractPerformance(session) : Promise.resolve([]),
    listWorkflowNotifications(session),
    listMandateQuotes(session),
    listMandateBookings(session),
    listControlActions(session),
    canInspectTeam ? listMonthlyReports(session) : Promise.resolve([]),
    listQuoteRoomsForSession(session),
  ]);

  const visibleTenders = tenders.filter((tender) => canViewTender(session, tender));
  const ownApplications = applications.filter((application) => isApplicationOwnedByGsa(session, application));
  const appliedTenderIds = new Set(ownApplications.map((application) => application.tenderId));
  const newTenders = visibleTenders.filter((tender) => !appliedTenderIds.has(tender.id));
  const activeAlerts = alerts.filter((alert) => alert.status === "active");
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const atRiskContracts = canInspectTeam ? performance.filter((snapshot) => snapshot.riskLevel !== "green") : [];
  const openActions = controlActions.filter((action) => action.status !== "completed" && action.status !== "cancelled");
  const criticalOpenActions = openActions.filter((action) => action.severity === "critical");
  const completedYesterday = buildYesterdayCompletions(controlActions);
  const reportFixes = canInspectTeam ? reports.filter((report) => report.status === "changes-requested") : [];
  const bookingByQuoteId = new Set(bookings.map((booking) => booking.quoteId));
  const quotesToBook = quotes.filter((quote) => (quote.status === "auto-approved" || quote.status === "airline-approved") && !bookingByQuoteId.has(quote.id));
  const visibleQuoteIds = new Set(quotes.map((quote) => quote.id));
  const customerThreads = buildCustomerThreads(quoteRooms.filter((room) => visibleQuoteIds.has(room.quoteId)), quotes);
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
  const teamLoad = canInspectTeam
    ? buildTeamLoad({
        customerThreadsNeedingReply,
        quotesToBook,
        openActions,
        reportFixes,
      })
    : [];
  const urgentWorkCount = customerThreadsNeedingReply.length + quotesToBook.length + criticalOpenActions.length + (canInspectTeam ? reportFixes.length : activeAlerts.length);
  const completedYesterdayCount = completedYesterday.reduce((sum, owner) => sum + owner.count, 0);
  const todayLabel = formatToday(new Date());

  return (
    <>
      <Topbar title="Today Cockpit" subtitle={session.company} />
      <main className="p-5 animate-fade-in">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
          <section className="rounded-2xl border border-border-ui bg-surface p-5 shadow-[0_2px_10px_rgba(11,30,79,0.06)] animate-fade-up">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">{todayLabel}</p>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Start with the work that blocks money.</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                      {canInspectTeam
                        ? "This cockpit shows live desk work first. Reporting, tenders, and route context stay one level down."
                        : "This cockpit only shows assigned customers, quotes, bookings, tracking, and capacity alerts you can act on today."}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link href="/gsa/tasks">Open full task list</Link>
                  </Button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <StartTile
                    href="/gsa/quotes"
                    icon={<Inbox className="h-5 w-5" />}
                    label="Customer replies"
                    value={String(customerThreadsNeedingReply.length)}
                    helper={`${activeCustomerThreads.length} active thread${activeCustomerThreads.length === 1 ? "" : "s"}`}
                    tone={customerThreadsNeedingReply.length ? "warning" : "success"}
                  />
                  <StartTile
                    href="/gsa/quotes"
                    icon={<PackageCheck className="h-5 w-5" />}
                    label="Approved quotes"
                    value={String(quotesToBook.length)}
                    helper="Need booking follow-up"
                    tone={quotesToBook.length ? "warning" : "success"}
                  />
                  <StartTile
                    href={canInspectTeam ? "/gsa/tasks" : "/gsa/capacity-alerts"}
                    icon={canInspectTeam ? <AlertTriangle className="h-5 w-5" /> : <PlaneTakeoff className="h-5 w-5" />}
                    label={canInspectTeam ? "Critical actions" : "Capacity alerts"}
                    value={String(canInspectTeam ? criticalOpenActions.length + reportFixes.length : activeAlerts.length)}
                    helper={canInspectTeam ? `${activeAlerts.length + atRiskContracts.length} risks on watch` : "Call assigned customers when airline capacity opens"}
                    tone={(canInspectTeam ? criticalOpenActions.length || reportFixes.length : activeAlerts.length) ? "danger" : "success"}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border-ui bg-surface2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Shift check</p>
                    <p className="mt-1 text-sm font-semibold text-ink">What changed before 08:00</p>
                  </div>
                  <Badge variant={urgentWorkCount ? "warning" : "success"}>{urgentWorkCount} do first</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <MiniStat icon={<Clock3 className="h-4 w-4" />} label="Open now" value={String(workQueue.length)} helper="Items in the morning queue" />
                  <MiniStat icon={<CheckCircle2 className="h-4 w-4" />} label="Closed yesterday" value={String(completedYesterdayCount)} helper={completedYesterday.length ? completedYesterday.slice(0, 2).map((owner) => owner.name).join(", ") : "No closed actions recorded"} />
                  <MiniStat icon={<TrendingUp className="h-4 w-4" />} label="Month booked" value={formatMoney(monthRevenue)} helper={`${formatKg(monthWeight)} handled`} />
                </div>
              </div>
            </div>
          </section>

          <section className={`grid items-start gap-4 ${canInspectTeam ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border-ui p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckSquare2 className="h-5 w-5 text-brand" />
                      Next up
                    </CardTitle>
                    <p className="mt-1 text-sm text-ink-muted">Maximum four actions. Clear these before opening the rest of the app.</p>
                  </div>
                  <Badge variant={workQueue.length ? "default" : "success"}>{workQueue.length} open</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {workQueue.length > 0 ? (
                  <div className="divide-y divide-border-ui">
                    {workQueue.slice(0, 4).map((item, index) => <FocusTaskRow key={item.key} item={item} index={index + 1} />)}
                  </div>
                ) : (
                  <div className="p-5">
                    <EmptyState
                      title="No urgent work right now"
                      body={canInspectTeam ? "New customer replies, approved quotes, airline actions, and report fixes will appear here first." : "New customer replies, approved quotes, assigned follow-ups, and capacity alerts will appear here first."}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {canInspectTeam && (
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand" />
                    Team handoff
                  </CardTitle>
                  <p className="text-sm text-ink-muted">Who has open work, plus what was closed yesterday.</p>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4 pt-0">
                  {teamLoad.length > 0 ? (
                    teamLoad.slice(0, 4).map((owner) => <TeamLoadRow key={owner.key} owner={owner} />)
                  ) : (
                    <EmptyState title="No assigned workload" body="Open control actions, report fixes, and booking follow-ups will create a team handoff." />
                  )}
                  <div className="rounded-lg border border-border-ui bg-page/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Yesterday</p>
                    {completedYesterday.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {completedYesterday.slice(0, 3).map((owner) => (
                          <div key={owner.key} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate font-medium text-ink">{owner.name}</span>
                            <span className="shrink-0 text-ink-muted">{owner.count} closed</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-ink-muted">No completed actions recorded yesterday.</p>
                    )}
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href="/gsa/team">Open team</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card>
              <CardHeader className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Inbox className="h-5 w-5 text-brand" />
                      Customer desk
                    </CardTitle>
                    <p className="mt-1 text-sm text-ink-muted">Only live conversations. Old quote history stays in the inbox.</p>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/gsa/quotes">Open inbox</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4 pt-0">
                {activeCustomerThreads.length > 0 ? (
                  activeCustomerThreads.slice(0, 3).map((thread) => <CustomerThreadCompact key={thread.key} thread={thread} />)
                ) : (
                  <EmptyState title="No active customer threads" body="Imported emails, created quote rooms, and customer replies will show here." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand" />
                  {canInspectTeam ? "Business pulse" : "My sales pulse"}
                </CardTitle>
                <p className="text-sm text-ink-muted">
                  {canInspectTeam ? "Enough context for the morning, not a KPI page." : "A quick read of your assigned bookings before opening the full sales page."}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-0">
                <ControlStat label="Revenue MTD" value={formatMoney(monthRevenue)} helper={`${monthBookings.length} shipment${monthBookings.length === 1 ? "" : "s"}`} />
                <ControlStat label="Quote win rate" value={`${quoteWinRate}%`} helper={`${bookings.length} bookings from ${quotes.length} quotes`} />
                <ControlStat label="Route context" value={String(assignedRoutes.length)} helper="Assigned contract lanes" />
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href="/gsa/performance">{canInspectTeam ? "Open performance" : "Open my sales"}</Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {canInspectTeam ? (
              <>
                <NextArea
                  href="/gsa/tenders"
                  icon={<BriefcaseBusiness className="h-4 w-4" />}
                  title="Tender Desk"
                  value={`${newTenders.length} new`}
                  helper={`${ownApplications.length} submitted applications`}
                />
                <NextArea
                  href="/gsa/shipments"
                  icon={<Route className="h-4 w-4" />}
                  title="Shipment work"
                  value={`${monthBookings.length} booked`}
                  helper={`${assignedRoutes.length} assigned routes`}
                />
                <NextArea
                  href="/gsa/capacity-alerts"
                  icon={<PlaneTakeoff className="h-4 w-4" />}
                  title="Capacity"
                  value={`${activeAlerts.length} active`}
                  helper="Only urgent alerts enter the morning queue"
                />
                <NextArea
                  href="/gsa/monthly-reports"
                  icon={<FileSpreadsheet className="h-4 w-4" />}
                  title="Reports"
                  value={`${reportFixes.length} fixes`}
                  helper="Monthly work stays separate from live ops"
                />
              </>
            ) : (
              <>
                <NextArea
                  href="/gsa/customers"
                  icon={<Users className="h-4 w-4" />}
                  title="My customers"
                  value={`${customerThreads.length} active`}
                  helper="Only customers assigned to you"
                />
                <NextArea
                  href="/gsa/shipments"
                  icon={<Route className="h-4 w-4" />}
                  title="Shipments"
                  value={`${monthBookings.length} booked`}
                  helper="Track AWB status and customer updates"
                />
                <NextArea
                  href="/gsa/capacity-alerts"
                  icon={<PlaneTakeoff className="h-4 w-4" />}
                  title="Capacity alerts"
                  value={`${activeAlerts.length} active`}
                  helper="Sell available airline capacity fast"
                />
                <NextArea
                  href="/gsa/performance"
                  icon={<BarChart3 className="h-4 w-4" />}
                  title="My sales"
                  value={formatMoney(monthRevenue)}
                  helper={`${formatKg(monthWeight)} booked this month`}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function StartTile({ href, icon, label, value, helper, tone = "brand" }: { href: string; icon: React.ReactNode; label: string; value: string; helper: string; tone?: Tone }) {
  return (
    <Link href={href} className="group flex min-h-[104px] items-start gap-3 rounded-xl border border-border-ui bg-page/60 p-4 transition hover:border-brand/35 hover:bg-brand-light/35">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneClass(tone)}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
        </div>
        <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-ink tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-ink-muted">{helper}</p>
      </div>
    </Link>
  );
}

function MiniStat({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface px-3 py-3">
      <div className="mt-0.5 text-brand">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className="mt-0.5 truncate text-base font-bold text-ink tabular-nums">{value}</p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">{helper}</p>
      </div>
    </div>
  );
}

function FocusTaskRow({ item, index }: { item: WorkItem; index: number }) {
  return (
    <Link href={item.href} className="grid gap-3 px-4 py-3.5 transition hover:bg-brand-light/35 md:grid-cols-[36px_minmax(0,1fr)_88px] md:items-center">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface2 text-sm font-bold text-ink-muted tabular-nums">{index}</span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant={priorityVariant(item.priority)} className="shrink-0">{priorityLabel(item.priority)}</Badge>
          <span className="min-w-0 truncate text-xs text-ink-muted">{item.meta}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm font-semibold text-ink md:text-base">{item.title}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand md:justify-end">
        {item.cta}
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function TeamLoadRow({ owner }: { owner: TeamLoad }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{owner.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-muted">{owner.role}</p>
        </div>
        <Badge variant={owner.critical ? "warning" : "muted"}>{owner.count} open</Badge>
      </div>
      <p className="mt-2 line-clamp-1 text-sm text-ink-muted">{owner.nextItem}</p>
    </div>
  );
}

function CustomerThreadCompact({ thread }: { thread: CustomerThread }) {
  return (
    <Link href="/gsa/quotes" className="grid gap-3 rounded-lg border border-border-ui bg-surface2 p-3 transition hover:border-brand/40 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{thread.customer}</p>
          <Badge variant={threadStateVariant(thread.stateTone)}>{thread.stateLabel}</Badge>
        </div>
        <p className="mt-1 truncate text-xs text-ink-muted">{thread.contact || "No contact"} - {formatDateTime(thread.latestAt)}</p>
        <p className="mt-2 line-clamp-1 text-sm text-ink-muted">{thread.latest}</p>
      </div>
      <div className="flex gap-2 md:justify-end">
        <Badge variant="muted">{thread.quoteCount} quote{thread.quoteCount === 1 ? "" : "s"}</Badge>
        <Badge variant="muted">{thread.roomCount} room{thread.roomCount === 1 ? "" : "s"}</Badge>
      </div>
    </Link>
  );
}

function ControlStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-3">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1 truncate text-xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-1 truncate text-xs text-ink-muted">{helper}</p>
    </div>
  );
}

function NextArea({ href, icon, title, value, helper }: { href: string; icon: React.ReactNode; title: string; value: string; helper: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-border-ui bg-surface px-4 py-3 transition hover:border-brand/35 hover:bg-brand-light/35">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-ink-muted">
            {icon}
            <p className="truncate text-sm font-semibold text-ink">{title}</p>
          </div>
          <p className="mt-2 text-lg font-bold text-ink tabular-nums">{value}</p>
          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{helper}</p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
      </div>
    </Link>
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
        icon: <CheckSquare2 className="h-5 w-5" />,
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

function buildYesterdayCompletions(actions: Awaited<ReturnType<typeof listControlActions>>): TeamCompletion[] {
  const owners = new Map<string, TeamCompletion>();

  for (const action of actions) {
    if (action.status !== "completed") continue;
    if (!isYesterday(action.closedAt ?? action.updatedAt)) continue;

    const name = action.assigneeName || action.lastUpdatedBy || "Unassigned";
    const key = name.toLowerCase();
    const owner = owners.get(key) ?? { key, name, count: 0 };
    owner.count += 1;
    owners.set(key, owner);
  }

  return [...owners.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function canViewGsaTeam(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  return session.role === "gsa" && ["owner", "admin", "manager"].includes(session.accessRole ?? "owner");
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

function isYesterday(value: string) {
  const time = new Date(value);
  if (!Number.isFinite(time.getTime())) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    time.getFullYear() === yesterday.getFullYear() &&
    time.getMonth() === yesterday.getMonth() &&
    time.getDate() === yesterday.getDate()
  );
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

function formatToday(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(value);
}

function toneClass(tone: Tone) {
  if (tone === "danger") return "bg-danger-bg text-danger";
  if (tone === "warning") return "bg-warning-bg text-warning";
  if (tone === "success") return "bg-success-bg text-success";
  if (tone === "muted") return "bg-surface2 text-ink-muted";
  return "bg-brand-light text-brand";
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
