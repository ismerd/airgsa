"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileText, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MandateAuditEvent, MandateQuote } from "@/lib/services/mandate-execution-store";
import type { ContractControlRules, LivePartnerContract } from "@/lib/services/tender-workflow-store";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<LivePartnerContract[]>([]);
  const [quotes, setQuotes] = useState<MandateQuote[]>([]);
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

  const selectedContract = contracts.find((contract) => contract.id === selectedContractId) ?? null;
  const pendingApprovals = quotes.filter((quote) => quote.status === "airline-approval-required");
  const belowFloorQuotes = quotes.filter((quote) => quote.floorRatePerKg && quote.requestedRatePerKg < quote.floorRatePerKg);
  const activeRoutes = contracts.reduce((sum, contract) => sum + contract.contractRoutes.filter((route) => route.status === "assigned").length, 0);
  const atRiskContracts = useMemo(() => contracts.filter((contract) => {
    const contractQuotes = quotes.filter((quote) => quote.contractId === contract.id);
    return contractQuotes.some((quote) => quote.status === "airline-approval-required" || quote.status === "airline-rejected");
  }), [contracts, quotes]);

  async function refresh() {
    const [contractRes, quoteRes, auditRes] = await Promise.all([
      fetch("/api/contracts", { cache: "no-store" }),
      fetch("/api/quotes", { cache: "no-store" }),
      fetch("/api/audit", { cache: "no-store" }),
    ]);
    const [contractData, quoteData, auditData] = await Promise.all([contractRes.json(), quoteRes.json(), auditRes.json()]);
    setContracts(contractRes.ok ? contractData.contracts ?? [] : []);
    setQuotes(quoteRes.ok ? quoteData.quotes ?? [] : []);
    setAuditEvents(auditRes.ok ? auditData.auditEvents ?? [] : []);
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

  return (
    <>
      <Topbar title="Contracts & KPI" subtitle="Mandate control center" />
      <main className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<FileText className="h-4 w-4" />} label="Live contracts" value={String(contracts.length)} />
          <SummaryCard icon={<SlidersHorizontal className="h-4 w-4" />} label="Assigned routes" value={String(activeRoutes)} />
          <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="Pending approvals" value={String(pendingApprovals.length)} tone="warning" />
          <SummaryCard icon={<ShieldCheck className="h-4 w-4" />} label="Contracts at risk" value={String(atRiskContracts.length)} tone={atRiskContracts.length ? "warning" : "success"} />
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
                <p className="text-sm text-ink-muted">These rules decide whether GSA quotes can be confirmed automatically or need airline approval.</p>
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
                  <p className="mt-1 text-xs text-ink-muted">{event.actorName} - {new Date(event.createdAt).toLocaleString("en-GB")}</p>
                </div>
              ))}
              {auditEvents.length === 0 && <p className="text-sm text-ink-muted">No audit events yet.</p>}
            </CardContent>
          </Card>
        </div>

        {belowFloorQuotes.length > 0 && (
          <div className="rounded-lg border border-warning/25 bg-warning-bg p-3 text-sm text-warning">
            {belowFloorQuotes.length} quote{belowFloorQuotes.length === 1 ? "" : "s"} breached a configured rate floor.
          </div>
        )}
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

function SummaryCard({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value: string; tone?: "default" | "warning" | "success" }) {
  const color = tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-brand";
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

function QuoteStatusBadge({ quote }: { quote: MandateQuote }) {
  const map: Record<MandateQuote["status"], { label: string; variant: "default" | "success" | "warning" | "muted" | "danger" }> = {
    draft: { label: "Draft", variant: "muted" },
    "auto-approved": { label: "Auto", variant: "success" },
    "airline-approval-required": { label: "Needs approval", variant: "warning" },
    "airline-approved": { label: "Approved", variant: "success" },
    "airline-rejected": { label: "Rejected", variant: "danger" },
    countered: { label: "Countered", variant: "default" },
    declined: { label: "Declined", variant: "muted" },
  };
  const config = map[quote.status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
