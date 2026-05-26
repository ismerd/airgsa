"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Send, UploadCloud } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ContractPerformanceSnapshot, MonthlyContractReport } from "@/lib/services/mandate-execution-store";
import type { LivePartnerContract } from "@/lib/services/tender-workflow-store";

const REPORT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

type ReportForm = {
  contractId: string;
  period: string;
  reportedRevenue: string;
  reportedTonnageKg: string;
  reportedQuotes: string;
  reportedBookings: string;
  summary: string;
  pipelineNotes: string;
  risks: string;
  supportNeeded: string;
  attachmentName: string;
  attachmentDataUrl: string;
  attachmentMimeType: string;
  attachmentSize: number;
  ownerName: string;
  ownerEmail: string;
};

const emptyForm: ReportForm = {
  contractId: "",
  period: new Date().toISOString().slice(0, 7),
  reportedRevenue: "0",
  reportedTonnageKg: "0",
  reportedQuotes: "0",
  reportedBookings: "0",
  summary: "",
  pipelineNotes: "",
  risks: "",
  supportNeeded: "",
  attachmentName: "",
  attachmentDataUrl: "",
  attachmentMimeType: "",
  attachmentSize: 0,
  ownerName: "",
  ownerEmail: "",
};

export default function GsaMonthlyReportsPage() {
  const [contracts, setContracts] = useState<LivePartnerContract[]>([]);
  const [performance, setPerformance] = useState<ContractPerformanceSnapshot[]>([]);
  const [reports, setReports] = useState<MonthlyContractReport[]>([]);
  const [form, setForm] = useState<ReportForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  const operationalContracts = useMemo(
    () => contracts.filter((contract) => contract.status === "active"),
    [contracts],
  );

  useEffect(() => {
    if (!form.contractId && operationalContracts.length > 0) {
      const contract = operationalContracts[0];
      const snapshot = performance.find((item) => item.contractId === contract.id);
      setForm((current) => hydrateForm(current, contract.id, snapshot));
    }
  }, [operationalContracts, performance, form.contractId]);

  const selectedContract = operationalContracts.find((contract) => contract.id === form.contractId) ?? null;
  const selectedPerformance = performance.find((item) => item.contractId === form.contractId) ?? null;
  const currentReport = reports.find((report) => report.contractId === form.contractId && report.period === form.period);
  const reportLocked = currentReport ? ["submitted", "accepted", "rejected"].includes(currentReport.status) : false;
  const totals = useMemo(() => ({
    submitted: reports.filter((report) => report.status === "submitted").length,
    accepted: reports.filter((report) => report.status === "accepted").length,
    changes: reports.filter((report) => report.status === "changes-requested").length,
  }), [reports]);

  async function refresh() {
    const [contractRes, performanceRes, reportRes] = await Promise.all([
      fetch("/api/contracts", { cache: "no-store" }),
      fetch("/api/performance", { cache: "no-store" }),
      fetch("/api/monthly-reports", { cache: "no-store" }),
    ]);
    const [contractData, performanceData, reportData] = await Promise.all([contractRes.json(), performanceRes.json(), reportRes.json()]);
    setContracts(contractRes.ok ? contractData.contracts ?? [] : []);
    setPerformance(performanceRes.ok ? performanceData.performance ?? [] : []);
    setReports(reportRes.ok ? reportData.monthlyReports ?? [] : []);
  }

  function update<K extends keyof ReportForm>(key: K, value: ReportForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function loadActuals() {
    if (!selectedPerformance) return;
    setForm((current) => hydrateForm(current, current.contractId, selectedPerformance));
  }

  function loadExisting(report: MonthlyContractReport) {
    setForm({
      contractId: report.contractId,
      period: report.period,
      reportedRevenue: String(report.reportedRevenue),
      reportedTonnageKg: String(report.reportedTonnageKg),
      reportedQuotes: String(report.reportedQuotes),
      reportedBookings: String(report.reportedBookings),
      summary: report.summary,
      pipelineNotes: report.pipelineNotes ?? "",
      risks: report.risks ?? "",
      supportNeeded: report.supportNeeded ?? "",
      attachmentName: report.attachmentName ?? "",
      attachmentDataUrl: "",
      attachmentMimeType: report.attachmentMimeType ?? "",
      attachmentSize: report.attachmentSize ?? 0,
      ownerName: report.ownerName ?? "",
      ownerEmail: report.ownerEmail ?? "",
    });
  }

  async function saveReport(submit: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/monthly-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          reportedRevenue: Number(form.reportedRevenue),
          reportedTonnageKg: Number(form.reportedTonnageKg),
          reportedQuotes: Number(form.reportedQuotes),
          reportedBookings: Number(form.reportedBookings),
          submit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Monthly report could not be saved");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="Monthly reports" subtitle="Contract reporting to airline" />
      <main className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-3">
          <Metric label="Submitted" value={String(totals.submitted)} />
          <Metric label="Accepted" value={String(totals.accepted)} />
          <Metric label="Changes requested" value={String(totals.changes)} />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-brand" /> Prepare monthly report</CardTitle>
              <p className="text-sm text-ink-muted">Report actual performance and recovery plan against the airline contract.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {operationalContracts.length === 0 ? (
                <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">No active contracts available for reporting. Airline activation is required before monthly reporting opens.</div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Contract">
                      <Select value={form.contractId} onChange={(event) => {
                        const snapshot = performance.find((item) => item.contractId === event.target.value);
                        setForm((current) => hydrateForm(current, event.target.value, snapshot));
                      }}>
                        {operationalContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.airline} - {contract.market}</option>)}
                      </Select>
                    </Field>
                    <Field label="Period">
                      <Input type="month" value={form.period} onChange={(event) => update("period", event.target.value)} />
                    </Field>
                    <Field label="Attachment">
                      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border-ui bg-surface px-3 text-sm text-ink-muted">
                        <UploadCloud className="h-4 w-4" />
                        {form.attachmentName || "Attach file name"}
                        <Input
                          type="file"
                          accept=".xlsx,.xls,.csv,.pdf"
                          className="sr-only"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (file.size > REPORT_ATTACHMENT_MAX_BYTES) {
                              setError("Attachment must be 5 MB or smaller");
                              event.target.value = "";
                              return;
                            }
                            update("attachmentName", file.name);
                            update("attachmentMimeType", file.type);
                            update("attachmentSize", file.size);
                            update("attachmentDataUrl", await readFileAsDataUrl(file));
                          }}
                        />
                      </label>
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Report owner"><Input value={form.ownerName} onChange={(event) => update("ownerName", event.target.value)} /></Field>
                    <Field label="Owner email"><Input type="email" value={form.ownerEmail} onChange={(event) => update("ownerEmail", event.target.value)} /></Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <Field label="Revenue EUR"><Input type="number" value={form.reportedRevenue} onChange={(event) => update("reportedRevenue", event.target.value)} /></Field>
                    <Field label="Tonnage kg"><Input type="number" value={form.reportedTonnageKg} onChange={(event) => update("reportedTonnageKg", event.target.value)} /></Field>
                    <Field label="Quotes"><Input type="number" value={form.reportedQuotes} onChange={(event) => update("reportedQuotes", event.target.value)} /></Field>
                    <Field label="Bookings"><Input type="number" value={form.reportedBookings} onChange={(event) => update("reportedBookings", event.target.value)} /></Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Executive summary"><Textarea value={form.summary} onChange={(event) => update("summary", event.target.value)} /></Field>
                    <Field label="Pipeline notes"><Textarea value={form.pipelineNotes} onChange={(event) => update("pipelineNotes", event.target.value)} /></Field>
                    <Field label="Risks"><Textarea value={form.risks} onChange={(event) => update("risks", event.target.value)} /></Field>
                    <Field label="Support needed"><Textarea value={form.supportNeeded} onChange={(event) => update("supportNeeded", event.target.value)} /></Field>
                  </div>

                  {currentReport?.airlineReviewNote && (
                    <div className="rounded-lg border border-warning/25 bg-warning-bg p-3 text-sm text-warning">
                      Airline review v{currentReport.version ?? 1}: {currentReport.airlineReviewNote}
                    </div>
                  )}

                  {currentReport && (
                    <div className="rounded-lg border border-border-ui bg-surface2 p-3 text-sm text-ink-muted">
                      Current version v{currentReport.version ?? 1} · {currentReport.status}
                      {currentReport.changeRequestCount ? ` · ${currentReport.changeRequestCount} change request${currentReport.changeRequestCount === 1 ? "" : "s"}` : ""}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={loadActuals} disabled={!selectedPerformance}>Use live actuals</Button>
                    <Button variant="outline" onClick={() => saveReport(false)} disabled={saving || reportLocked || !selectedContract || !form.summary}>Save draft</Button>
                    <Button onClick={() => saveReport(true)} disabled={saving || reportLocked || !selectedContract || !form.summary}>
                      <Send className="h-4 w-4" />
                      Submit to airline
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live actuals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Metric label="Revenue" value={formatMoney(selectedPerformance?.revenueAmount ?? 0)} />
              <Metric label="Tonnage" value={`${Math.round(selectedPerformance?.tonnageKg ?? 0).toLocaleString()} kg`} />
              <Metric label="Quotes" value={String(selectedPerformance?.quoteCount ?? 0)} />
              <Metric label="Bookings" value={String(selectedPerformance?.bookingCount ?? 0)} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report history</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border-ui bg-surface2 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  {["Period", "Version", "Airline", "Market", "Revenue", "Tonnage", "Status", "Attachment", "Action"].map((header) => <th key={header} className="px-4 py-3 text-left">{header}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ui">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-4 py-3 font-semibold text-ink">{report.period}</td>
                    <td className="px-4 py-3 text-ink-muted">v{report.version ?? 1}</td>
                    <td className="px-4 py-3 text-ink-muted">{report.airline}</td>
                    <td className="px-4 py-3 text-ink-muted">{report.market}</td>
                    <td className="px-4 py-3 text-ink">{formatMoney(report.reportedRevenue)}</td>
                    <td className="px-4 py-3 text-ink-muted">{Math.round(report.reportedTonnageKg).toLocaleString()} kg</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(report.status)}>{report.status}</Badge></td>
                    <td className="px-4 py-3">
                      {report.attachmentUrl ? (
                        <a className="text-xs font-semibold text-brand underline" href={report.attachmentUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        <span className="text-xs text-ink-muted">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => loadExisting(report)}>Load</Button>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-muted">No monthly reports yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function hydrateForm(current: ReportForm, contractId: string, snapshot?: ContractPerformanceSnapshot): ReportForm {
  return {
    ...current,
    contractId,
    reportedRevenue: String(snapshot?.revenueAmount ?? current.reportedRevenue),
    reportedTonnageKg: String(Math.round(snapshot?.tonnageKg ?? Number(current.reportedTonnageKg))),
    reportedQuotes: String(snapshot?.quoteCount ?? current.reportedQuotes),
    reportedBookings: String(snapshot?.bookingCount ?? current.reportedBookings),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>{children}</label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="mt-2 text-xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}

function statusVariant(status: MonthlyContractReport["status"]): "default" | "success" | "warning" | "danger" | "muted" {
  if (status === "accepted") return "success";
  if (status === "submitted") return "default";
  if (status === "changes-requested") return "warning";
  if (status === "rejected") return "danger";
  return "muted";
}

function formatMoney(value: number) {
  return `EUR ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
