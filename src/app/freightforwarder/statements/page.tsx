"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileText } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Statement = {
  id: string;
  type: string;
  period: string;
  requestedAt: string;
  status: "ready" | "processing" | "pending";
  size?: string;
};

const initialStatements: Statement[] = [
  { id: "stmt-001", type: "Monthly shipment summary", period: "Apr 2026", requestedAt: "May 1, 2026", status: "ready", size: "142 KB" },
  { id: "stmt-002", type: "AWB cost breakdown", period: "Q1 2026", requestedAt: "Apr 5, 2026", status: "ready", size: "318 KB" },
  { id: "stmt-003", type: "Carrier invoice reconciliation", period: "Mar 2026", requestedAt: "Apr 2, 2026", status: "ready", size: "87 KB" },
  { id: "stmt-004", type: "Monthly shipment summary", period: "Mar 2026", requestedAt: "Apr 1, 2026", status: "ready", size: "128 KB" },
];

const statementTypes = [
  "Monthly shipment summary",
  "AWB cost breakdown",
  "Carrier invoice reconciliation",
  "Weight & volume report",
  "On-time performance report",
  "Route utilisation summary",
];

const statusVariant: Record<string, "success" | "warning" | "muted"> = {
  ready: "success",
  processing: "warning",
  pending: "muted",
};

export default function StatementsPage() {
  const [statements, setStatements] = useState<Statement[]>(initialStatements);
  const [requested, setRequested] = useState(false);
  const [form, setForm] = useState({ type: "", from: "", to: "" });

  function request() {
    if (!form.type || !form.from || !form.to) return;
    const newStmt: Statement = {
      id: `stmt-${Date.now()}`,
      type: form.type,
      period: `${form.from} – ${form.to}`,
      requestedAt: "May 6, 2026",
      status: "processing",
    };
    setStatements((prev) => [newStmt, ...prev]);
    setRequested(true);
    setForm({ type: "", from: "", to: "" });
  }

  return (
    <>
      <Topbar title="Statements" subtitle="Freight Forwarder" />
      <main className="p-5">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">

            {/* Request form */}
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-brand" />
                    Request statement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {requested && (
                    <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Statement request submitted. It will be ready within 24 hours.
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Statement type</label>
                    <Select
                      value={form.type}
                      onChange={(e) => { setRequested(false); setForm((f) => ({ ...f, type: (e.target as HTMLSelectElement).value })); }}
                    >
                      <option value="">Select type</option>
                      {statementTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-muted">From</label>
                      <Input type="date" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-muted">To</label>
                      <Input type="date" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Filter by AWB (optional)</label>
                    <Input placeholder="e.g. 235-12345678" className="font-mono" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Format</label>
                    <Select>
                      <option>PDF</option>
                      <option>Excel (.xlsx)</option>
                      <option>CSV</option>
                    </Select>
                  </div>
                  <Button className="w-full" disabled={!form.type || !form.from || !form.to} onClick={request}>
                    Request statement
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Statement history */}
            <Card>
              <CardHeader>
                <CardTitle>Statement history</CardTitle>
              </CardHeader>
              <CardContent>
                {statements.length === 0 ? (
                  <p className="text-sm text-ink-muted">No statements yet.</p>
                ) : (
                  <div className="divide-y divide-border-ui">
                    {statements.map((stmt) => (
                      <div key={stmt.id} className="flex items-center justify-between gap-4 py-4">
                        <div className="flex items-start gap-3">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                          <div>
                            <p className="text-sm font-semibold text-ink">{stmt.type}</p>
                            <p className="text-xs text-ink-muted">Period: {stmt.period}</p>
                            <p className="text-xs text-ink-muted">Requested {stmt.requestedAt}{stmt.size ? ` · ${stmt.size}` : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={statusVariant[stmt.status]}>{stmt.status}</Badge>
                          {stmt.status === "ready" && (
                            <button className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface2 hover:text-ink" title="Download">
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </>
  );
}
