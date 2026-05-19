"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  MessageSquare,
  PlaneTakeoff,
  RefreshCw,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Topbar } from "@/components/dashboard/topbar";
import type { Registration } from "@/lib/registrations";

function RoleBadge({ role }: { role: "airline" | "gsa" }) {
  return role === "airline" ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">
      <PlaneTakeoff className="h-3 w-3" /> Airline
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs font-semibold text-violet-400">
      <Building2 className="h-3 w-3" /> GSA
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AccountsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reviewStates, setReviewStates] = useState<Record<string, "idle" | "loading" | "done">>({});
  const [oneTimeCredentials, setOneTimeCredentials] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/registrations");
      const data = await res.json();
      setRegistrations(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function review(id: string, action: "approve" | "reject") {
    setReviewStates((s) => ({ ...s, [id]: "loading" }));
    try {
      const response = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: notes[id] ?? "" }),
      });
      if (!response.ok) throw new Error("Review failed");
      const data = await response.json();
      if (action === "approve" && typeof data.oneTimePassword === "string") {
        setOneTimeCredentials((current) => ({ ...current, [id]: data.oneTimePassword }));
      }
      setReviewStates((s) => ({ ...s, [id]: "done" }));
      await load();
    } catch {
      setReviewStates((s) => ({ ...s, [id]: "idle" }));
    }
  }

  const pending = registrations.filter((r) => r.status === "pending");
  const reviewed = registrations.filter((r) => r.status !== "pending");
  const approved = registrations.filter((r) => r.status === "approved");

  return (
    <>
      <Topbar title="Accounts" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* ── Pending approvals ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-brand" />
                Pending approvals
              </CardTitle>
              <div className="flex items-center gap-3">
                {pending.length > 0 && (
                  <Badge variant="warning">{pending.length} awaiting review</Badge>
                )}
                <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface2" />)}
                </div>
              ) : pending.length === 0 ? (
                <div className="rounded-xl border border-border-ui bg-surface2 px-5 py-8 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-ink-muted/40" />
                  <p className="mt-3 text-sm text-ink-muted">No pending registrations.</p>
                </div>
              ) : (
                <div className="divide-y divide-border-ui">
                  {pending.map((reg) => {
                    const isLoading = reviewStates[reg.id] === "loading";
                    return (
                      <div key={reg.id} className="py-5 space-y-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface2 text-sm font-bold text-ink">
                              {reg.name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-ink">{reg.name}</p>
                              <p className="text-sm text-ink-muted">{reg.email}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <RoleBadge role={reg.role} />
                                <span className="text-sm text-ink-muted">{reg.company}</span>
                                <span className="text-xs text-ink-muted">· {reg.country}</span>
                              </div>
                              {reg.phone && (
                                <p className="mt-1 text-xs text-ink-muted">{reg.phone}</p>
                              )}
                            </div>
                          </div>
                          <p className="shrink-0 text-xs text-ink-muted">
                            {formatDate(reg.submittedAt)}
                          </p>
                        </div>

                        {reg.message && (
                          <div className="ml-14 flex gap-2 rounded-lg border border-border-ui bg-surface2 px-3 py-2.5">
                            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                            <p className="text-xs leading-5 text-ink-muted">{reg.message}</p>
                          </div>
                        )}

                        <div className="ml-14 space-y-2">
                          <Textarea
                            placeholder="Optional note (visible in audit log)…"
                            className="text-xs"
                            rows={2}
                            value={notes[reg.id] ?? ""}
                            onChange={(e) => setNotes((n) => ({ ...n, [reg.id]: e.target.value }))}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                              onClick={() => review(reg.id, "reject")}
                              disabled={isLoading}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => review(reg.id, "approve")}
                              disabled={isLoading}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {isLoading ? "Processing…" : "Approve"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Recent reviews (from real registrations) ── */}
          {reviewed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-ink-muted" />
                  Reviewed registrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border-ui">
                  {reviewed.map((reg) => (
                    <div key={reg.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-sm font-bold text-ink">
                          {reg.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{reg.name}</p>
                          <p className="text-xs text-ink-muted">{reg.email} · {reg.company}</p>
                          <div className="mt-1"><RoleBadge role={reg.role} /></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {reg.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                            <XCircle className="h-3.5 w-3.5" /> Rejected
                          </span>
                        )}
                        {reg.reviewedAt && (
                          <span className="text-xs text-ink-muted">{formatDate(reg.reviewedAt)}</span>
                        )}
                      </div>
                      {oneTimeCredentials[reg.id] && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          Temporary password: <span className="font-mono font-semibold">{oneTimeCredentials[reg.id]}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Active accounts ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand" />
                Active accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approved.length === 0 ? (
                <div className="rounded-xl border border-border-ui bg-surface2 px-5 py-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-ink-muted/40" />
                  <p className="mt-3 text-sm text-ink-muted">No approved registrations yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-ui text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                        <th className="pb-3 text-left">User</th>
                        <th className="pb-3 text-left">Company</th>
                        <th className="pb-3 text-left">Role</th>
                        <th className="pb-3 text-left">Reviewed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-ui">
                      {approved.map((acc) => (
                        <tr key={acc.id}>
                          <td className="py-3">
                            <div>
                              <p className="font-medium text-ink">{acc.name}</p>
                              <p className="text-xs text-ink-muted">{acc.email}</p>
                            </div>
                          </td>
                          <td className="py-3 text-ink-muted">{acc.company}</td>
                          <td className="py-3"><RoleBadge role={acc.role} /></td>
                          <td className="py-3">
                            <Badge variant="success">
                              {acc.reviewedAt ? formatDate(acc.reviewedAt) : "approved"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </>
  );
}
