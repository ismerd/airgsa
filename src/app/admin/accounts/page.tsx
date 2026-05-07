"use client";

import { useState } from "react";
import { Building2, CheckCircle2, PlaneTakeoff, UserCheck, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/dashboard/topbar";

type PendingReg = {
  id: string;
  name: string;
  company: string;
  role: "airline" | "gsa";
  email: string;
  registeredAt: string;
};

type Account = {
  id: string;
  name: string;
  company: string;
  role: "airline" | "gsa";
  email: string;
  status: "active" | "suspended";
};

const initialPending: PendingReg[] = [
  { id: "reg-001", name: "Sophie Laurent", company: "AlpineAir Cargo", role: "airline", email: "s.laurent@alpineair.com", registeredAt: "May 4, 2026" },
  { id: "reg-002", name: "Mikael Bergström", company: "Nordic Cargo Sales", role: "gsa", email: "m.bergstrom@nordiccargo.se", registeredAt: "May 5, 2026" },
  { id: "reg-003", name: "Amara Diallo", company: "WestAfrica Freight Partners", role: "gsa", email: "a.diallo@wafp.net", registeredAt: "May 5, 2026" },
  { id: "reg-004", name: "Lucas Bianchi", company: "Adriatica Airlines", role: "airline", email: "l.bianchi@adriatica.it", registeredAt: "May 6, 2026" },
];

const allAccounts: Account[] = [
  { id: "acc-001", name: "Thomas Weber", company: "AeroBridge Cargo", role: "airline", email: "t.weber@aerobridge.com", status: "active" },
  { id: "acc-002", name: "Maria Kovacs", company: "BlueWing Cargo Solutions", role: "gsa", email: "m.kovacs@bluewing.de", status: "active" },
  { id: "acc-003", name: "James Osei", company: "Atlantic AirCargo Partners", role: "gsa", email: "j.osei@atlanticac.com", status: "active" },
  { id: "acc-004", name: "Elena Petrov", company: "NorthStar Airways", role: "airline", email: "e.petrov@northstar.aero", status: "active" },
  { id: "acc-005", name: "Lars Hansen", company: "NordicLift Aviation Services", role: "gsa", email: "l.hansen@nordiclift.dk", status: "active" },
  { id: "acc-006", name: "Zara Ahmed", company: "PolarLine Cargo", role: "airline", email: "z.ahmed@polarline.no", status: "suspended" },
  { id: "acc-007", name: "Isabel Ferreira", company: "Lusitania AirCargo Services", role: "gsa", email: "i.ferreira@lusitania.pt", status: "active" },
  { id: "acc-008", name: "Anders Lindqvist", company: "Skandia Cargo Network", role: "gsa", email: "a.lindqvist@skandia.se", status: "active" },
];

function RoleBadge({ role }: { role: "airline" | "gsa" }) {
  return role === "airline" ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">
      <PlaneTakeoff className="h-3 w-3" /> Airline
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/30 bg-violet-300/10 px-2.5 py-1 text-xs font-semibold text-violet-200">
      <Building2 className="h-3 w-3" /> GSA
    </span>
  );
}

export default function AccountsPage() {
  const [pending, setPending] = useState<PendingReg[]>(initialPending);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  function approve(id: string) {
    setApproved((prev) => new Set(prev).add(id));
    setRejected((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  function reject(id: string) {
    setRejected((prev) => new Set(prev).add(id));
    setApproved((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  const pendingCount = pending.filter((r) => !approved.has(r.id) && !rejected.has(r.id)).length;

  return (
    <>
      <Topbar title="Accounts" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Pending approvals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-brand" />
                Pending approvals
              </CardTitle>
              {pendingCount > 0 && (
                <Badge variant="warning">{pendingCount} awaiting review</Badge>
              )}
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-sm text-ink-muted">No pending registrations.</p>
              ) : (
                <div className="divide-y divide-border-ui">
                  {pending.map((reg) => {
                    const isApproved = approved.has(reg.id);
                    const isRejected = rejected.has(reg.id);
                    return (
                      <div key={reg.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-sm font-semibold text-ink">
                            {reg.name[0]}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-ink">{reg.name}</p>
                            <p className="text-xs text-ink-muted">{reg.email}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <RoleBadge role={reg.role} />
                              <span className="text-xs text-ink-muted">{reg.company}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-13 sm:pl-0">
                          <span className="text-xs text-ink-muted">{reg.registeredAt}</span>
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                              <XCircle className="h-3.5 w-3.5" /> Rejected
                            </span>
                          )}
                          {!isApproved && !isRejected && (
                            <>
                              <Button size="sm" variant="outline" className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10" onClick={() => reject(reg.id)}>
                                Reject
                              </Button>
                              <Button size="sm" onClick={() => approve(reg.id)}>
                                Approve
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand" />
                All accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-ui text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      <th className="pb-3 text-left">User</th>
                      <th className="pb-3 text-left">Company</th>
                      <th className="pb-3 text-left">Role</th>
                      <th className="pb-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-ui">
                    {allAccounts.map((acc) => (
                      <tr key={acc.id} className="text-ink-muted">
                        <td className="py-3">
                          <div>
                            <p className="font-medium text-ink">{acc.name}</p>
                            <p className="text-xs text-ink-muted">{acc.email}</p>
                          </div>
                        </td>
                        <td className="py-3">{acc.company}</td>
                        <td className="py-3">
                          <RoleBadge role={acc.role} />
                        </td>
                        <td className="py-3">
                          <Badge variant={acc.status === "active" ? "success" : "danger"}>
                            {acc.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </>
  );
}
