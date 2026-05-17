"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, CheckCircle2, Copy, LockKeyhole, Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TeamAccount } from "@/lib/services/team-accounts";

const accessProfiles = [
  {
    name: "Operator",
    value: "operator",
    description: "Sees the cargo workspace, own tasks and own performance only.",
    permissions: ["Cargo workspace", "Own tasks", "Own metrics"],
  },
  {
    name: "Team lead",
    value: "manager",
    description: "Can review the team queue and inspect employee output.",
    permissions: ["Workspace", "Team queue", "Team metrics"],
  },
  {
    name: "Company admin",
    value: "admin",
    description: "Controls users, profile, tenders and company settings.",
    permissions: ["All company areas", "Team access", "Settings"],
  },
];

export function TeamAccessClient({
  initialAccounts,
  company,
  role,
}: {
  initialAccounts: TeamAccount[];
  company: string;
  role: "airline" | "gsa";
}) {
  const [accounts, setAccounts] = useState<TeamAccount[]>(initialAccounts);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("Cargo operator");
  const [accessRole, setAccessRole] = useState("operator");
  const [created, setCreated] = useState<TeamAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeOperators = accounts.filter((account) => account.accessRole === "operator").length;
  const totals = useMemo(
    () => ({
      quotes: accounts.reduce((sum, account) => sum + account.quotes, 0),
      bookings: accounts.reduce((sum, account) => sum + account.bookings, 0),
    }),
    [accounts],
  );

  async function inviteEmployee(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCreated(null);
    setLoading(true);

    try {
      const response = await fetch("/api/team/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, title, accessRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Employee could not be invited.");
        return;
      }
      setCreated(data.account);
      setAccounts((current) => {
        const exists = current.some((account) => account.email === data.account.email);
        return exists ? current.map((account) => (account.email === data.account.email ? data.account : account)) : [...current, data.account];
      });
      setName("");
      setEmail("");
      setTitle(role === "gsa" ? "Cargo operator" : "Capacity operator");
      setAccessRole("operator");
    } catch {
      setError("Team service is not reachable.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCredentials(account: TeamAccount) {
    if (!account.password) return;
    await navigator.clipboard.writeText(`${account.email} / ${account.password}`);
  }

  return (
    <>
      <Card className="overflow-hidden rounded-xl">
        <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="border-b border-border-ui p-6 xl:border-b-0 xl:border-r">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Employee control</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">Every employee gets a focused workspace.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">
                  Operators should work, not navigate through admin tools. Invite an employee, choose the access profile,
                  then hand over the generated credentials.
                </p>
              </div>
              <Button type="button" onClick={() => setInviteOpen((current) => !current)}>
                <UserPlus className="h-4 w-4" />
                Invite employee
              </Button>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <Metric icon={<Users className="h-4 w-4" />} label="Employees" value={`${accounts.length}`} />
              <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Operators" value={`${activeOperators}`} />
              <Metric icon={<BarChart3 className="h-4 w-4" />} label="Bookings" value={`${totals.bookings}`} />
            </div>
          </div>
          <div className="bg-surface2 p-6">
            <h3 className="text-sm font-bold text-ink">Ready-to-login employee accounts</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Team access is scoped to your company. Development accounts can receive an immediate password; production
              invites stay pending until real authentication delivery is connected.
            </p>
            <div className="mt-5 rounded-xl border border-border-ui bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Company</p>
              <p className="mt-2 text-sm font-semibold text-ink">{company}</p>
            </div>
          </div>
        </div>
      </Card>

      {inviteOpen && (
        <Card className="rounded-xl p-5">
          <form onSubmit={inviteEmployee} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_220px_auto] lg:items-end">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
              Name
              <Input className="mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Employee name" required />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
              Email
              <Input className="mt-2" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="employee@company.com" required />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
              Job title
              <Input className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
              Access
              <Select className="mt-2" value={accessRole} onChange={(event) => setAccessRole(event.target.value)}>
                <option value="operator">Operator</option>
                <option value="manager">Team lead</option>
                <option value="admin">Company admin</option>
              </Select>
            </label>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create access"}</Button>
          </form>
          {error && <p className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
          {created && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/20 bg-success-bg p-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Employee account created
                </p>
                <p className="mt-1 font-mono text-sm text-ink">{created.email}{created.password ? ` / ${created.password}` : " / invitation pending"}</p>
              </div>
              {created.password && (
                <Button type="button" variant="outline" onClick={() => copyCredentials(created)}>
                  <Copy className="h-4 w-4" />
                  Copy credentials
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Employees</h2>
              <p className="mt-1 text-sm text-ink-muted">People who can log into this company workspace.</p>
            </div>
            <Badge variant="success">Access controlled</Badge>
          </div>
          <div className="mt-5 overflow-x-auto rounded-xl border border-border-ui">
            <div className="grid min-w-[820px] grid-cols-[1.4fr_1fr_0.7fr_0.7fr_0.8fr_0.8fr] bg-surface2 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
              <span>Employee</span>
              <span>Access</span>
              <span>Quotes</span>
              <span>Bookings</span>
              <span>Response</span>
              <span>Login</span>
            </div>
            {accounts.map((member) => (
              <div key={member.email} className="grid min-w-[820px] grid-cols-[1.4fr_1fr_0.7fr_0.7fr_0.8fr_0.8fr] items-center border-t border-border-ui px-4 py-4">
                <div>
                  <p className="text-sm font-bold text-ink">{member.name}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Mail className="h-3.5 w-3.5" />
                    {member.email}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-brand">{member.title}</p>
                </div>
                <div>
                  <Badge variant={member.accessRole === "admin" ? "default" : "muted"}>{member.accessRole}</Badge>
                  <p className="mt-2 text-xs text-ink-muted">{member.status}</p>
                </div>
                <p className="text-sm font-bold text-ink">{member.quotes}</p>
                <p className="text-sm font-bold text-ink">{member.bookings}</p>
                <p className="text-sm font-bold text-ink">{member.responseTime}</p>
                {member.password ? (
                  <button type="button" onClick={() => copyCredentials(member)} className="text-left text-xs font-semibold text-brand hover:underline">
                    Copy
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-ink-muted">Pending</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Access profiles</h2>
              <p className="mt-1 text-sm text-ink-muted">Role templates used by login and navigation.</p>
            </div>
            <LockKeyhole className="h-5 w-5 text-brand" />
          </div>
          <div className="mt-5 space-y-3">
            {accessProfiles.map((profile) => (
              <div key={profile.name} className="rounded-xl border border-border-ui bg-surface2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink">{profile.name}</h3>
                    <p className="mt-2 text-xs leading-5 text-ink-muted">{profile.description}</p>
                  </div>
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.permissions.map((permission) => (
                    <Badge key={permission} variant="muted">{permission}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface2 px-4 py-3">
      <div className="flex items-center gap-2 text-brand">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
