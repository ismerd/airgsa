"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDollarSign, Clock, FileSpreadsheet, FileText, PackageCheck, ShieldCheck, SlidersHorizontal, Target } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ContractControlAction,
  ContractPerformanceSnapshot,
  ContractTimelineEvent,
  MandateAuditEvent,
  MandateBooking,
  MandateQuote,
  MonthlyContractReport,
} from "@/lib/services/mandate-execution-store";
import type { ContractControlRules, LivePartnerContract } from "@/lib/services/tender-workflow-store";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<LivePartnerContract[]>([]);
  const [quotes, setQuotes] = useState<MandateQuote[]>([]);
  const [bookings, setBookings] = useState<MandateBooking[]>([]);
  const [performance, setPerformance] = useState<ContractPerformanceSnapshot[]>([]);
  const [controlActions, setControlActions] = useState<ContractControlAction[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyContractReport[]>([]);
  const [timeline, setTimeline] = useState<ContractTimelineEvent[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [auditEvents, setAuditEvents] = useState<MandateAuditEvent[]>([]);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!selectedContractId && contracts.length > 0) setSelectedContractId(contracts[0].id);
  }, [contracts, selectedContractId]);

  useEffect(() => {
    if (selectedContractId) refreshTimeline(selectedContractId);
  }, [selectedContractId]);

  const selectedContract = contracts.find((contract) => contract.id === selectedContractId) ?? null;
  const pendingApprovals = quotes.filter((quote) => quote.status === "airline-approval-required");
  const expiredQuotes = quotes.filter((quote) => quote.status === "expired");
  const belowFloorQuotes = quotes.filter((quote) => quote.floorRatePerKg && quote.requestedRatePerKg < quote.floorRatePerKg);
  const activeRoutes = contracts.reduce((sum, contract) => sum + contract.contractRoutes.filter((route) => route.status === "assigned").length, 0);
  const attributedRevenue = bookings.reduce((sum, booking) => sum + booking.revenueAmount, 0);
  const selectedContractRevenue = selectedContract
    ? bookings.filter((booking) => booking.contractId === selectedContract.id).reduce((sum, booking) => sum + booking.revenueAmount, 0)
    : 0;
  const bookedRevenue = bookings.reduce((sum, booking) => sum + (booking.bookedRevenueAmount ?? booking.revenueAmount), 0);
  const revenueDelta = attributedRevenue - bookedRevenue;
  const selectedPerformance = performance.find((item) => item.contractId === selectedContractId) ?? null;
  const openControlActions = controlActions.filter((action) => action.status !== "completed" && action.status !== "cancelled");
  const submittedReports = monthlyReports.filter((report) => report.status === "submitted");
  async function refresh() {
    const [contractRes, quoteRes, bookingRes, performanceRes, controlActionRes, reportRes, auditRes] = await Promise.all([
      fetch("/api/contracts", { cache: "no-store" }),
      fetch("/api/quotes", { cache: "no-store" }),
      fetch("/api/bookings", { cache: "no-store" }),
      fetch("/api/performance", { cache: "no-store" }),
      fetch("/api/control-actions", { cache: "no-store" }),
      fetch("/api/monthly-reports", { cache: "no-store" }),
      fetch("/api/audit", { cache: "no-store" }),
    ]);
    const [contractData, quoteData, bookingData, performanceData, controlActionData, reportData, auditData] = await Promise.all([
      contractRes.json(),
      quoteRes.json(),
      bookingRes.json(),
      performanceRes.json(),
      controlActionRes.json(),
      reportRes.json(),
      auditRes.json(),
    ]);
    setContracts(contractRes.ok ? contractData.contracts ?? [] : []);
    setQuotes(quoteRes.ok ? quoteData.quotes ?? [] : []);
    setBookings(bookingRes.ok ? bookingData.bookings ?? [] : []);
    setPerformance(performanceRes.ok ? performanceData.performance ?? [] : []);
    setControlActions(controlActionRes.ok ? controlActionData.controlActions ?? [] : []);
    setMonthlyReports(reportRes.ok ? reportData.monthlyReports ?? [] : []);
    setAuditEvents(auditRes.ok ? auditData.auditEvents ?? [] : []);
  }

  async function refreshTimeline(contractId: string) {
    const res = await fetch(`/api/contracts/${contractId}/timeline`, { cache: "no-store" });
    const data = await res.json();
    setTimeline(res.ok ? data.timeline ?? [] : []);
  }

  async function updateRules(rules: ContractControlRules) {
    if (!selectedContract) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ controlRules: rules }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Contract controls could not be updated");
      setContracts((current) => current.map((contract) => (contract.id === data.contract.id ? data.contract : contract)));
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function decideQuote(quote: MandateQuote, action: "approve" | "reject") {
    setError(null);
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason: action === "approve" ? "Airline approved below-floor quote exception." : "Airline rejected below-floor quote exception.",
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Quote decision failed");
    await refresh();
  }

  async function openControlAction(item: ContractPerformanceSnapshot, title: string) {
    setSaving(true);
    setError(null);
    try {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res = await fetch("/api/control-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: item.contractId,
          title,
          description: item.riskReasons.join("; ") || "Airline requested follow-up from KPI control center.",
          severity: item.riskLevel === "red" ? "critical" : "warning",
          dueDate,
          assigneeName: item.gsaName,
          sourceRiskReasons: item.riskReasons,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Control action could not be opened");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function updateControlAction(action: ContractControlAction, status: ContractControlAction["status"]) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/control-actions/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Control action could not be updated");
      setControlActions((current) => current.map((item) => (item.id === data.controlAction.id ? data.controlAction : item)));
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function generateAutomaticActions() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/control-actions/auto", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Automatic actions could not be generated");
      await refresh();
      if (data.created === 0) setError("No new KPI breach actions were needed.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function reviewMonthlyReport(report: MonthlyContractReport, status: "accepted" | "changes-requested" | "rejected") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/monthly-reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          airlineReviewNote: reviewNotes[report.id] ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Monthly report review failed");
      setMonthlyReports((current) => current.map((item) => (item.id === data.monthlyReport.id ? data.monthlyReport : item)));
      await refresh();
      if (selectedContractId) await refreshTimeline(selectedContractId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="Contracts & KPI" subtitle="Mandate control center" />
      <main className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
          <SummaryCard icon={<FileText className="h-4 w-4" />} label="Live contracts" value={String(contracts.length)} />
          <SummaryCard icon={<SlidersHorizontal className="h-4 w-4" />} label="Assigned routes" value={String(activeRoutes)} />
          <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="Pending approvals" value={String(pendingApprovals.length)} tone="warning" />
          <SummaryCard icon={<ShieldCheck className="h-4 w-4" />} label="Open actions" value={String(openControlActions.length)} tone={openControlActions.length ? "warning" : "success"} />
          <SummaryCard icon={<FileSpreadsheet className="h-4 w-4" />} label="Reports to review" value={String(submittedReports.length)} tone={submittedReports.length ? "warning" : "success"} />
          <SummaryCard icon={<Clock className="h-4 w-4" />} label="Expired quotes" value={String(expiredQuotes.length)} tone={expiredQuotes.length ? "danger" : "success"} />
          <SummaryCard icon={<CircleDollarSign className="h-4 w-4" />} label="Attributed revenue" value={formatMoney(attributedRevenue)} tone="success" />
          <SummaryCard icon={<Target className="h-4 w-4" />} label="Revenue delta" value={formatMoney(revenueDelta)} tone={revenueDelta < 0 ? "warning" : "success"} />
        </section>

        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Mandates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contracts.length === 0 ? (
                <p className="text-sm text-ink-muted">No accepted contracts yet.</p>
              ) : contracts.map((contract) => (
                <button
                  key={contract.id}
                  type="button"
                  onClick={() => setSelectedContractId(contract.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${selectedContractId === contract.id ? "border-brand bg-brand-light" : "border-border-ui bg-surface2 hover:border-brand/40"}`}
                >
                  <p className="font-semibold text-ink">{contract.gsaName}</p>
                  <p className="mt-1 text-xs text-ink-muted">{contract.market}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="muted">{contract.contractRoutes.filter((route) => route.status === "assigned").length} routes</Badge>
                    <Badge variant="success">{formatMoney(bookings.filter((booking) => booking.contractId === contract.id).reduce((sum, booking) => sum + booking.revenueAmount, 0))}</Badge>
                    <Badge variant={contract.controlRules?.territoryExclusivity === "exclusive" ? "success" : "muted"}>{contract.controlRules?.territoryExclusivity ?? "shared"}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedContract && (
            <Card>
              <CardHeader>
                <CardTitle>Control rules for {selectedContract.gsaName}</CardTitle>
                <p className="text-sm text-ink-muted">
                  These rules decide whether GSA quotes can be confirmed automatically or need airline approval.
                  Booked revenue: {formatMoney(selectedContractRevenue)}. KPI status: {selectedPerformance?.riskLevel ?? "not scored"}.
                </p>
              </CardHeader>
              <CardContent>
                <RuleEditor contract={selectedContract} saving={saving} onSave={updateRules} />
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Airline approval queue</CardTitle>
            <p className="text-sm text-ink-muted">Below-floor customer quotes cannot be confirmed by GSAs until the airline decides.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">No quote exceptions pending.</div>
            ) : pendingApprovals.map((quote) => (
              <div key={quote.id} className="rounded-lg border border-warning/25 bg-warning-bg p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-ink">{quote.customer} - {quote.origin}-{quote.destination}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Requested EUR {quote.requestedRatePerKg.toFixed(2)}/kg vs floor EUR {quote.floorRatePerKg?.toFixed(2) ?? "-"} - {quote.weightKg.toLocaleString()} kg
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">Customer deadline: {formatDateTime(quote.deadline)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decideQuote(quote, "approve")}>
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => decideQuote(quote, "reject")}>Reject</Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle>Quote compliance</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="border-b border-border-ui bg-surface2 text-xs uppercase tracking-wider text-ink-muted">
                  <tr>
                    {["Customer", "Route", "GSA", "Rate", "Floor", "Status", "Decision"].map((header) => <th key={header} className="px-4 py-3 text-left">{header}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-ui">
                  {quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td className="px-4 py-3 font-semibold text-ink">{quote.customer}</td>
                      <td className="px-4 py-3 text-ink-muted">{quote.origin}-{quote.destination}</td>
                      <td className="px-4 py-3 text-ink-muted">{quote.gsaName}</td>
                      <td className="px-4 py-3 text-ink">EUR {quote.requestedRatePerKg.toFixed(2)}</td>
                      <td className="px-4 py-3 text-ink-muted">{quote.floorRatePerKg ? `EUR ${quote.floorRatePerKg.toFixed(2)}` : "-"}</td>
                      <td className="px-4 py-3"><QuoteStatusBadge quote={quote} /></td>
                      <td className="px-4 py-3 text-xs text-ink-muted">{quote.decisionReason ?? "-"}</td>
                    </tr>
                  ))}
                  {quotes.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-muted">No quotes submitted yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-brand" /> Audit trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditEvents.slice(0, 10).map((event) => (
                <div key={event.id} className="rounded-lg border border-border-ui bg-surface2 p-3">
                  <p className="text-sm font-semibold text-ink">{event.summary}</p>
                  <p className="mt-1 text-xs text-ink-muted">{event.actorName} - {formatDateTime(event.createdAt)}</p>
                </div>
              ))}
              {auditEvents.length === 0 && <p className="text-sm text-ink-muted">No audit events yet.</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-brand" /> Revenue attribution</CardTitle>
            <p className="text-sm text-ink-muted">Confirmed bookings created from approved GSA quotes, tied back to contract, route and AWB.</p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-border-ui bg-surface2 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  {["AWB", "Customer", "Route", "GSA", "Status", "Weight", "Rate", "Revenue"].map((header) => <th key={header} className="px-4 py-3 text-left">{header}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ui">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-4 py-3 font-semibold text-ink">{booking.awbNumber}</td>
                    <td className="px-4 py-3 text-ink">{booking.customer}</td>
                    <td className="px-4 py-3 text-ink-muted">{booking.origin}-{booking.destination}</td>
                    <td className="px-4 py-3 text-ink-muted">{booking.gsaName}</td>
                    <td className="px-4 py-3"><Badge variant={booking.status === "cancelled" ? "danger" : booking.status === "flown" ? "success" : "warning"}>{booking.status}</Badge></td>
                    <td className="px-4 py-3 text-ink-muted">{booking.weightKg.toLocaleString()} kg</td>
                    <td className="px-4 py-3 text-ink-muted">EUR {booking.ratePerKg.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{formatMoney(booking.revenueAmount)}</p>
                      <p className="text-xs text-ink-muted">{booking.reconciliationStatus ?? "pending"}</p>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-muted">No attributed booking revenue yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-brand" /> Monthly report review</CardTitle>
              <p className="text-sm text-ink-muted">Official GSA monthly submissions against contract KPIs and booked revenue.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {submittedReports.map((report) => (
                <div key={report.id} className="rounded-lg border border-border-ui bg-surface2 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{report.gsaName} - {report.period}</p>
                        <Badge variant="muted">v{report.version ?? 1}</Badge>
                        <Badge variant={reportStatusVariant(report.status)}>{report.status}</Badge>
                        {report.changeRequestCount ? <Badge variant="warning">{report.changeRequestCount} change request{report.changeRequestCount === 1 ? "" : "s"}</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">{report.market} - {formatMoney(report.reportedRevenue)} - {Math.round(report.reportedTonnageKg).toLocaleString()} kg</p>
                      <p className="mt-2 text-sm text-ink">{report.summary}</p>
                      {report.risks && <p className="mt-1 text-sm text-warning">Risks: {report.risks}</p>}
                      {report.supportNeeded && <p className="mt-1 text-sm text-ink-muted">Support needed: {report.supportNeeded}</p>}
                    </div>
                    <div className="w-full space-y-2 lg:w-80">
                      <Textarea
                        value={reviewNotes[report.id] ?? report.airlineReviewNote ?? ""}
                        onChange={(event) => setReviewNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                        placeholder="Review note to GSA..."
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" disabled={saving} onClick={() => reviewMonthlyReport(report, "accepted")}>Accept</Button>
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => reviewMonthlyReport(report, "changes-requested")}>Request changes</Button>
                        <Button size="sm" variant="destructive" disabled={saving} onClick={() => reviewMonthlyReport(report, "rejected")}>Reject</Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {submittedReports.length === 0 && <p className="text-sm text-ink-muted">No monthly reports awaiting review.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contract timeline</CardTitle>
              <p className="text-sm text-ink-muted">{selectedContract?.gsaName ?? "Select a contract"} history across awards, routes, quotes, bookings, reports and actions.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeline.slice(0, 14).map((event) => (
                <div key={event.id} className="rounded-lg border border-border-ui bg-surface2 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={timelineVariant(event.type)}>{event.type}</Badge>
                    {event.status && <Badge variant="muted">{event.status}</Badge>}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">{event.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">{event.summary}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">{formatDateTime(event.createdAt)} {event.actor ? `- ${event.actor}` : ""}</p>
                </div>
              ))}
              {timeline.length === 0 && <p className="text-sm text-ink-muted">No contract timeline yet.</p>}
            </CardContent>
          </Card>
        </div>

        {belowFloorQuotes.length > 0 && (
          <div className="rounded-lg border border-warning/25 bg-warning-bg p-3 text-sm text-warning">
            {belowFloorQuotes.length} quote{belowFloorQuotes.length === 1 ? "" : "s"} breached a configured rate floor.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-brand" /> KPI control actions</CardTitle>
            <p className="text-sm text-ink-muted">Contract performance against current monthly commitments, with airline actions when risk appears.</p>
            <div className="pt-2">
              <Button size="sm" variant="outline" disabled={saving} onClick={generateAutomaticActions}>
                Generate KPI breach actions
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {performance.map((item) => (
              <div key={item.contractId} className="rounded-lg border border-border-ui bg-surface2 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{item.gsaName}</p>
                      <Badge variant={riskVariant(item.riskLevel)}>{item.riskLevel}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{item.market}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                    <MiniMetric label="Revenue" value={`${item.revenueAttainmentPct}%`} sub={`${formatMoney(item.revenueAmount)} / ${formatMoney(item.revenueTarget)}`} />
                    <MiniMetric label="Tonnage" value={`${item.tonnageAttainmentPct}%`} sub={`${Math.round(item.tonnageKg).toLocaleString()} / ${Math.round(item.tonnageTargetKg).toLocaleString()} kg`} />
                    <MiniMetric label="Win rate" value={`${item.winRatePct}%`} sub={`Target ${item.winRateTargetPct}%`} />
                    <MiniMetric label="Quotes" value={`${item.quoteCount}`} sub={`Target ${item.quoteTarget}`} />
                  </div>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Risk reasons</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(item.riskReasons.length ? item.riskReasons : ["No active risk signals"]).map((reason) => (
                        <Badge key={reason} variant={item.riskReasons.length ? "warning" : "success"}>{reason}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Recommended airline actions</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.recommendedActions.length ? item.recommendedActions.map((action) => {
                        const existing = openControlActions.find((openAction) => openAction.contractId === item.contractId && openAction.title === action);
                        return (
                          <div key={action} className="flex items-center gap-2 rounded-lg border border-border-ui bg-surface p-2">
                            <span className="text-sm text-ink">{action}</span>
                            {existing ? (
                              <Badge variant={statusVariant(existing.status)}>{existing.status}</Badge>
                            ) : (
                              <Button size="sm" variant="outline" disabled={saving} onClick={() => openControlAction(item, action)}>
                                Open action
                              </Button>
                            )}
                          </div>
                        );
                      }) : <Badge variant="success">Keep monitoring</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {performance.length === 0 && <p className="text-sm text-ink-muted">No performance data yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open GSA control actions</CardTitle>
            <p className="text-sm text-ink-muted">Persistent airline-issued actions that the GSA must answer or complete.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {openControlActions.map((action) => (
              <div key={action.id} className="rounded-lg border border-border-ui bg-surface2 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{action.title}</p>
                      <Badge variant={severityVariant(action.severity)}>{action.severity}</Badge>
                      <Badge variant={statusVariant(action.status)}>{action.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{action.gsaName} - {action.market} - due {action.dueDate ?? "not set"}</p>
                    {action.assigneeName && <p className="mt-1 text-xs text-ink-muted">Owner: {action.assigneeName}{action.assigneeEmail ? ` - ${action.assigneeEmail}` : ""}</p>}
                    {action.gsaResponse && <p className="mt-2 rounded-lg border border-border-ui bg-surface p-3 text-sm text-ink">{action.gsaResponse}</p>}
                    {(action.comments ?? []).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {(action.comments ?? []).map((comment) => (
                          <div key={comment.id} className="rounded-lg border border-border-ui bg-surface p-3 text-sm">
                            <p className="font-semibold text-ink">{comment.createdByName} <span className="font-normal text-ink-muted">({comment.createdByRole})</span></p>
                            {comment.body && <p className="mt-1 text-ink-muted">{comment.body}</p>}
                            {comment.attachmentName && <p className="mt-1 text-xs font-semibold text-brand">Proof: {comment.attachmentName}</p>}
                            {(comment.attachmentUrl || comment.attachmentDataUrl) && (
                              <a className="mt-1 block text-xs font-semibold text-brand underline" href={comment.attachmentUrl ?? comment.attachmentDataUrl} target="_blank" rel="noreferrer">
                                Open proof
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={saving} onClick={() => updateControlAction(action, "completed")}>Complete</Button>
                    <Button size="sm" variant="ghost" disabled={saving} onClick={() => updateControlAction(action, "cancelled")}>Cancel</Button>
                  </div>
                </div>
              </div>
            ))}
            {openControlActions.length === 0 && <p className="text-sm text-ink-muted">No open control actions.</p>}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function RuleEditor({
  contract,
  saving,
  onSave,
}: {
  contract: LivePartnerContract;
  saving: boolean;
  onSave: (rules: ContractControlRules) => void;
}) {
  const [rules, setRules] = useState<ContractControlRules>(contract.controlRules ?? {});

  useEffect(() => {
    setRules(contract.controlRules ?? {});
  }, [contract.id, contract.controlRules]);

  function update<K extends keyof ContractControlRules>(key: K, value: ContractControlRules[K]) {
    setRules((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Rate floor EUR/kg">
          <Input type="number" step="0.01" value={rules.rateFloorPerKg ?? ""} onChange={(event) => update("rateFloorPerKg", event.target.value ? Number(event.target.value) : undefined)} />
        </Field>
        <Field label="Auto approval variance %">
          <Input type="number" value={rules.autoApprovalVariancePct ?? 0} onChange={(event) => update("autoApprovalVariancePct", Number(event.target.value))} />
        </Field>
        <Field label="Quote SLA hours">
          <Input type="number" value={rules.quoteResponseSlaHours ?? 4} onChange={(event) => update("quoteResponseSlaHours", Number(event.target.value))} />
        </Field>
        <Field label="Monthly revenue target">
          <Input type="number" value={rules.monthlyRevenueTarget ?? ""} onChange={(event) => update("monthlyRevenueTarget", event.target.value ? Number(event.target.value) : undefined)} />
        </Field>
        <Field label="Minimum monthly quotes">
          <Input type="number" value={rules.minimumMonthlyQuotes ?? ""} onChange={(event) => update("minimumMonthlyQuotes", event.target.value ? Number(event.target.value) : undefined)} />
        </Field>
        <Field label="Win rate target %">
          <Input type="number" value={rules.quoteWinRateTargetPct ?? ""} onChange={(event) => update("quoteWinRateTargetPct", event.target.value ? Number(event.target.value) : undefined)} />
        </Field>
        <Field label="Territory">
          <Select value={rules.territoryExclusivity ?? "shared"} onChange={(event) => update("territoryExclusivity", event.target.value as ContractControlRules["territoryExclusivity"])}>
            <option value="exclusive">Exclusive</option>
            <option value="shared">Shared</option>
            <option value="non-exclusive">Non-exclusive</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Named accounts">
          <Textarea
            value={(rules.namedAccounts ?? []).join("\n")}
            onChange={(event) => update("namedAccounts", event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
            placeholder="One account per line"
          />
        </Field>
        <Field label="Penalty / exception clause">
          <Textarea value={rules.penaltyClause ?? ""} onChange={(event) => update("penaltyClause", event.target.value)} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={rules.requireAirlineApprovalBelowFloor ?? true}
          onChange={(event) => update("requireAirlineApprovalBelowFloor", event.target.checked)}
        />
        Require airline approval below rate floor
      </label>

      <Button disabled={saving} onClick={() => onSave(rules)}>
        <ShieldCheck className="h-4 w-4" />
        Save control rules
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>{children}</label>;
}

function SummaryCard({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value: string; tone?: "default" | "warning" | "success" | "danger" }) {
  const color = tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-brand";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-surface2 ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
    </div>
  );
}

function riskVariant(risk: ContractPerformanceSnapshot["riskLevel"]): "success" | "warning" | "danger" {
  if (risk === "green") return "success";
  if (risk === "amber") return "warning";
  return "danger";
}

function severityVariant(severity: ContractControlAction["severity"]): "default" | "warning" | "danger" {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "default";
}

function statusVariant(status: ContractControlAction["status"]): "default" | "success" | "warning" | "muted" {
  if (status === "completed") return "success";
  if (status === "in-progress") return "warning";
  if (status === "cancelled") return "muted";
  return "default";
}

function reportStatusVariant(status: MonthlyContractReport["status"]): "default" | "success" | "warning" | "danger" | "muted" {
  if (status === "accepted") return "success";
  if (status === "submitted") return "default";
  if (status === "changes-requested") return "warning";
  if (status === "rejected") return "danger";
  return "muted";
}

function timelineVariant(type: ContractTimelineEvent["type"]): "default" | "success" | "warning" | "muted" {
  if (type === "booking") return "success";
  if (type === "control-action" || type === "monthly-report") return "warning";
  if (type === "audit") return "muted";
  return "default";
}

function QuoteStatusBadge({ quote }: { quote: MandateQuote }) {
  const map: Record<MandateQuote["status"], { label: string; variant: "default" | "success" | "warning" | "muted" | "danger" }> = {
    draft: { label: "Draft", variant: "muted" },
    "auto-approved": { label: "Auto", variant: "success" },
    "airline-approval-required": { label: "Needs approval", variant: "warning" },
    "airline-approved": { label: "Approved", variant: "success" },
    "airline-rejected": { label: "Rejected", variant: "danger" },
    countered: { label: "Countered", variant: "default" },
    declined: { label: "Declined", variant: "muted" },
    expired: { label: "Expired", variant: "danger" },
  };
  const config = map[quote.status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function formatMoney(value: number) {
  return `EUR ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}
