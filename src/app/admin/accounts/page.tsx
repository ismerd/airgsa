"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  KeyRound,
  MessageSquare,
  PlaneTakeoff,
  RefreshCw,
  RotateCcw,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Registration } from "@/lib/registrations";

type ReviewResponse = {
  registration?: Registration;
  localInviteUrl?: string;
  error?: string;
};

type AdminAccount = {
  id: string;
  email: string;
  name: string;
  role: "airline" | "gsa" | "admin";
  accessRole?: string;
  company: string;
  companyId?: string;
  status: "active" | "disabled";
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

type AccountAction = {
  account: AdminAccount;
  action: "disable" | "enable" | "delete";
};

export default function AccountsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reviewStates, setReviewStates] = useState<Record<string, "idle" | "loading" | "done">>({});
  const [accountAction, setAccountAction] = useState<AccountAction | null>(null);
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string; href?: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [registrationRes, accountRes] = await Promise.all([
        fetch("/api/admin/registrations"),
        fetch("/api/admin/accounts"),
      ]);
      const registrationData = await registrationRes.json();
      const accountData = await accountRes.json();
      setRegistrations(Array.isArray(registrationData) ? registrationData : []);
      setAccounts(accountRes.ok ? accountData.accounts ?? [] : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    setReviewStates((s) => ({ ...s, [id]: "loading" }));
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: notes[id] ?? "" }),
      });
      const data = (await response.json().catch(() => ({}))) as ReviewResponse;
      if (!response.ok) throw new Error(data.error || "Review failed");
      setReviewStates((s) => ({ ...s, [id]: "done" }));
      setFeedback({
        tone: "success",
        message: data.localInviteUrl
          ? "Approved. The invite email could not be delivered locally, so use this setup link for testing."
          : action === "approve"
            ? "Approved and invite flow started."
            : "Registration rejected.",
        href: data.localInviteUrl,
      });
      await load();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Review failed",
      });
      setReviewStates((s) => ({ ...s, [id]: "idle" }));
    }
  }

  async function confirmAccountAction() {
    if (!accountAction) return;
    setAccountActionLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(accountAction.account.id)}`, {
        method: accountAction.action === "delete" ? "DELETE" : "PATCH",
        headers: accountAction.action === "delete" ? undefined : { "Content-Type": "application/json" },
        body: accountAction.action === "delete" ? undefined : JSON.stringify({ action: accountAction.action }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Account action failed");
      setFeedback({
        tone: "success",
        message:
          accountAction.action === "delete"
            ? `${accountAction.account.email} was deleted.`
            : accountAction.action === "disable"
              ? `${accountAction.account.email} was blocked and can no longer sign in.`
              : `${accountAction.account.email} was reactivated.`,
      });
      setAccountAction(null);
      await load();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Account action failed",
      });
    } finally {
      setAccountActionLoading(false);
    }
  }

  async function createSetupLink(account: AdminAccount) {
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(account.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup-link" }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; localInviteUrl?: string };
      if (!response.ok || !data.localInviteUrl) throw new Error(data.error || "Setup link could not be created");
      setFeedback({
        tone: "success",
        message: `Setup link created for ${account.email}. It expires in 7 days and can be used once.`,
        href: data.localInviteUrl,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Setup link could not be created",
      });
    }
  }

  const pending = registrations.filter((r) => r.status === "pending");
  const reviewed = registrations.filter((r) => r.status !== "pending");
  const approvedRegistrationsByEmail = new Map(
    registrations
      .filter((registration) => registration.status === "approved")
      .map((registration) => [registration.email.toLowerCase(), registration]),
  );
  const managedAccounts = accounts.filter((account) => account.role === "airline" || account.role === "gsa");

  return (
    <>
      <Topbar title="Accounts" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {feedback && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                feedback.tone === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700"
              }`}
            >
              <p className="font-semibold">{feedback.message}</p>
              {feedback.href && (
                <a className="mt-2 inline-flex font-semibold underline" href={feedback.href}>
                  Open setup link
                </a>
              )}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-brand" />
                Pending approvals
              </CardTitle>
              <div className="flex items-center gap-3">
                {pending.length > 0 && <Badge variant="warning">{pending.length} awaiting review</Badge>}
                <Button variant="ghost" size="sm" onClick={load} disabled={loading} aria-label="Refresh accounts">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
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
                  <p className="mt-3 text-sm font-semibold text-ink">No pending registrations.</p>
                  <p className="mt-1 text-xs text-ink-muted">New airline and GSA signups will appear here for review.</p>
                </div>
              ) : (
                <div className="divide-y divide-border-ui">
                  {pending.map((reg) => {
                    const isLoading = reviewStates[reg.id] === "loading";
                    return (
                      <div key={reg.id} className="space-y-4 py-5">
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
                                <span className="text-xs text-ink-muted">- {reg.country}</span>
                              </div>
                              {reg.phone && <p className="mt-1 text-xs text-ink-muted">{reg.phone}</p>}
                            </div>
                          </div>
                          <p className="shrink-0 text-xs text-ink-muted">{formatDate(reg.submittedAt)}</p>
                        </div>

                        {reg.message && (
                          <div className="ml-14 flex gap-2 rounded-lg border border-border-ui bg-surface2 px-3 py-2.5">
                            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                            <p className="text-xs leading-5 text-ink-muted">{reg.message}</p>
                          </div>
                        )}

                        <div className="ml-14 space-y-2">
                          <Textarea
                            placeholder="Optional note (visible in audit log)..."
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
                            <Button size="sm" onClick={() => review(reg.id, "approve")} disabled={isLoading}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {isLoading ? "Processing..." : "Approve"}
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
                          <p className="text-xs text-ink-muted">{reg.email} - {reg.company}</p>
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
                        {reg.reviewedAt && <span className="text-xs text-ink-muted">{formatDate(reg.reviewedAt)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand" />
                Platform accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {managedAccounts.length === 0 ? (
                <div className="rounded-xl border border-border-ui bg-surface2 px-5 py-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-ink-muted/40" />
                  <p className="mt-3 text-sm font-semibold text-ink">No platform accounts yet.</p>
                  <p className="mt-1 text-xs text-ink-muted">Approved registrations create accounts with setup links.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="border-b border-border-ui text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                        <th className="pb-3 text-left">User</th>
                        <th className="pb-3 text-left">Company</th>
                        <th className="pb-3 text-left">Role</th>
                        <th className="pb-3 text-left">Status</th>
                        <th className="pb-3 text-left">Reviewed</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-ui">
                      {managedAccounts.map((acc) => {
                        const registration = approvedRegistrationsByEmail.get(acc.email.toLowerCase());
                        return (
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
                              {acc.status === "active" ? (
                                <Badge variant="success">Active</Badge>
                              ) : (
                                <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
                                  Blocked
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <Badge variant="success">
                                {registration?.reviewedAt ? formatDate(registration.reviewedAt) : "Account"}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex justify-end gap-2">
                                {acc.status === "active" ? (
                                  <Button size="sm" variant="outline" onClick={() => setAccountAction({ account: acc, action: "disable" })}>
                                    <Ban className="h-3.5 w-3.5" />
                                    Block
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" onClick={() => setAccountAction({ account: acc, action: "enable" })}>
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Enable
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => createSetupLink(acc)}>
                                  <KeyRound className="h-3.5 w-3.5" />
                                  Setup link
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setAccountAction({ account: acc, action: "delete" })}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      {accountAction && (
        <ConfirmAccountDialog
          action={accountAction}
          loading={accountActionLoading}
          onCancel={() => setAccountAction(null)}
          onConfirm={confirmAccountAction}
        />
      )}
    </>
  );
}

function RoleBadge({ role }: { role: "airline" | "gsa" | "admin" }) {
  if (role === "airline") {
    return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">
      <PlaneTakeoff className="h-3 w-3" /> Airline
    </span>
    );
  }

  if (role === "gsa") {
    return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs font-semibold text-violet-400">
      <Building2 className="h-3 w-3" /> GSA
    </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border-ui bg-surface2 px-2.5 py-1 text-xs font-semibold text-ink-muted">
      Admin
    </span>
  );
}

function ConfirmAccountDialog({
  action,
  loading,
  onCancel,
  onConfirm,
}: {
  action: AccountAction;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const destructive = action.action === "delete";
  const title =
    action.action === "delete"
      ? "Delete account?"
      : action.action === "disable"
        ? "Block account?"
        : "Reactivate account?";
  const body =
    action.action === "delete"
      ? "This removes the login account and invalidates pending password or invite links. The reviewed registration remains visible as audit history."
      : action.action === "disable"
        ? "This user will immediately lose login access until an admin reactivates the account."
        : "This user will be able to sign in again with their existing password or reset link.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border-ui bg-surface p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-2 ${destructive ? "bg-danger-bg text-danger" : "bg-amber-500/10 text-amber-500"}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">{body}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-border-ui bg-surface2 p-3">
          <p className="text-sm font-semibold text-ink">{action.account.name}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{action.account.email} - {action.account.company}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={loading}>
            {loading
              ? "Working..."
              : action.action === "delete"
                ? "Delete account"
                : action.action === "disable"
                  ? "Block account"
                  : "Reactivate account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
