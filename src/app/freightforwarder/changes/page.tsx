"use client";

import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, Plus, X } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type ChangeRequest = {
  id: string;
  awb: string;
  currentFlight: string;
  requestedFlight: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
};

const initialChanges: ChangeRequest[] = [
  { id: "chg-001", awb: "080-77889900", currentFlight: "NSA921 / May 5", requestedFlight: "NSA921 / May 9", reason: "Original flight delayed, perishables deadline constraint", status: "approved", submittedAt: "May 5, 2026" },
  { id: "chg-002", awb: "235-12345678", currentFlight: "ABR214 / May 6", requestedFlight: "ABR214 / May 8", reason: "Customs documentation delay at origin", status: "pending", submittedAt: "May 6, 2026" },
];

const reasons = [
  "Customs documentation delay",
  "Cargo not ready at origin",
  "Flight cancelled by airline",
  "Temperature requirement conflict",
  "Perishables deadline constraint",
  "Customer request / rescheduled delivery",
  "Other",
];

const statusVariant: Record<string, "success" | "warning" | "danger" | "muted"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

export default function ChangesPage() {
  const [changes, setChanges] = useState<ChangeRequest[]>(initialChanges);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ awb: "", currentFlight: "", requestedFlight: "", reason: "" });

  function submit() {
    if (!form.awb || !form.currentFlight || !form.requestedFlight) return;
    const newChange: ChangeRequest = {
      id: `chg-${Date.now()}`,
      awb: form.awb,
      currentFlight: form.currentFlight,
      requestedFlight: form.requestedFlight,
      reason: form.reason || "Not specified",
      status: "pending",
      submittedAt: "May 6, 2026",
    };
    setChanges((prev) => [newChange, ...prev]);
    setSubmitted(true);
    setShowForm(false);
    setForm({ awb: "", currentFlight: "", requestedFlight: "", reason: "" });
  }

  return (
    <>
      <Topbar title="Flight change" subtitle="Freight Forwarder" />
      <main className="p-5">
        <div className="mx-auto max-w-4xl space-y-6">

          {submitted && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Change request submitted. You will be notified once the airline confirms.
              <button onClick={() => setSubmitted(false)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-muted">Change requests</h2>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-2 h-4 w-4" />
              New request
            </Button>
          </div>

          {showForm && (
            <Card className="border-brand/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-brand" />
                  New flight change request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">AWB number</label>
                  <Input
                    placeholder="e.g. 235-12345678"
                    className="font-mono"
                    value={form.awb}
                    onChange={(e) => setForm((f) => ({ ...f, awb: e.target.value }))}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Current flight / date</label>
                    <Input
                      placeholder="e.g. SV803 / May 6"
                      value={form.currentFlight}
                      onChange={(e) => setForm((f) => ({ ...f, currentFlight: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Requested flight / date</label>
                    <Input
                      placeholder="e.g. SV803 / May 8"
                      value={form.requestedFlight}
                      onChange={(e) => setForm((f) => ({ ...f, requestedFlight: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Reason</label>
                  <Select
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: (e.target as HTMLSelectElement).value }))}
                  >
                    <option value="">Select reason</option>
                    {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button onClick={submit} disabled={!form.awb || !form.currentFlight || !form.requestedFlight}>
                    Submit request
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All change requests</CardTitle>
            </CardHeader>
            <CardContent>
              {changes.length === 0 ? (
                <p className="text-sm text-ink-muted">No change requests yet.</p>
              ) : (
                <div className="divide-y divide-border-ui">
                  {changes.map((c) => (
                    <div key={c.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-brand">{c.awb}</span>
                          <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
                          <span className="text-ink">{c.currentFlight}</span>
                          <ArrowLeftRight className="h-3.5 w-3.5 text-ink-muted" />
                          <span className="text-ink">{c.requestedFlight}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">{c.reason}</p>
                      </div>
                      <div className="shrink-0 text-xs text-ink-muted">{c.submittedAt}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
