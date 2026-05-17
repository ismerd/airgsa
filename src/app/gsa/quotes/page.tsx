"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Inbox, PackageCheck, Plus, Send, ShieldCheck, X } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { MandateBooking, MandateQuote, MandateQuoteStatus } from "@/lib/services/mandate-execution-store";
import type { LivePartnerContract } from "@/lib/services/tender-workflow-store";

type QuoteForm = {
  contractId: string;
  routeId: string;
  customer: string;
  contactName: string;
  contactEmail: string;
  cargoType: string;
  weightKg: string;
  pieces: string;
  requestedRatePerKg: string;
  flightDate: string;
  deadline: string;
};

const emptyForm: QuoteForm = {
  contractId: "",
  routeId: "",
  customer: "",
  contactName: "",
  contactEmail: "",
  cargoType: "General cargo",
  weightKg: "",
  pieces: "1",
  requestedRatePerKg: "",
  flightDate: "",
  deadline: "",
};

const statusConfig: Record<MandateQuoteStatus, { label: string; variant: "default" | "success" | "warning" | "muted" | "danger" }> = {
  draft: { label: "Draft", variant: "muted" },
  "auto-approved": { label: "Auto-approved", variant: "success" },
  "airline-approval-required": { label: "Airline approval", variant: "warning" },
  "airline-approved": { label: "Approved by airline", variant: "success" },
  "airline-rejected": { label: "Rejected by airline", variant: "danger" },
  countered: { label: "Countered", variant: "default" },
  declined: { label: "Declined", variant: "muted" },
};

export default function QuotesPage() {
  const [contracts, setContracts] = useState<LivePartnerContract[]>([]);
  const [quotes, setQuotes] = useState<MandateQuote[]>([]);
  const [bookings, setBookings] = useState<MandateBooking[]>([]);
  const [form, setForm] = useState<QuoteForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!form.contractId && contracts.length > 0) {
      const contract = contracts[0];
      setForm((current) => ({ ...current, contractId: contract.id, routeId: firstAssignedRouteId(contract) }));
    }
  }, [contracts, form.contractId]);

  const selectedContract = contracts.find((contract) => contract.id === form.contractId) ?? null;
  const selectedRoute = selectedContract?.contractRoutes.find((route) => route.id === form.routeId) ?? null;
  const pendingApprovalCount = quotes.filter((quote) => quote.status === "airline-approval-required").length;
  const approvedCount = quotes.filter((quote) => quote.status === "auto-approved" || quote.status === "airline-approved").length;
  const bookedRevenue = bookings.reduce((sum, booking) => sum + booking.revenueAmount, 0);
  const bookingByQuoteId = new Map(bookings.map((booking) => [booking.quoteId, booking]));
  const belowFloor = selectedContract?.controlRules?.rateFloorPerKg && Number(form.requestedRatePerKg)
    ? Number(form.requestedRatePerKg) < selectedContract.controlRules.rateFloorPerKg
    : false;

  async function refresh() {
    const [contractRes, quoteRes, bookingRes] = await Promise.all([
      fetch("/api/contracts", { cache: "no-store" }),
      fetch("/api/quotes", { cache: "no-store" }),
      fetch("/api/bookings", { cache: "no-store" }),
    ]);
    const [contractData, quoteData, bookingData] = await Promise.all([contractRes.json(), quoteRes.json(), bookingRes.json()]);
    setContracts(contractRes.ok ? contractData.contracts ?? [] : []);
    setQuotes(quoteRes.ok ? quoteData.quotes ?? [] : []);
    setBookings(bookingRes.ok ? bookingData.bookings ?? [] : []);
  }

  async function submitQuote() {
    if (!selectedContract || !selectedRoute) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          origin: selectedRoute.origin,
          destination: selectedRoute.destination,
          weightKg: Number(form.weightKg),
          pieces: Number(form.pieces),
          requestedRatePerKg: Number(form.requestedRatePerKg),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote could not be created");
      setQuotes((current) => [data.quote, ...current]);
      setForm({ ...emptyForm, contractId: selectedContract.id, routeId: selectedRoute.id });
      setShowCreate(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function actionQuote(quote: MandateQuote, action: "counter" | "decline") {
    const reason = action === "counter" ? "GSA sent counter-offer to customer." : "GSA declined the customer request.";
    const counterRatePerKg = action === "counter" ? Math.max(quote.floorRatePerKg ?? quote.requestedRatePerKg, quote.requestedRatePerKg) : undefined;
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason, counterRatePerKg }),
    });
    const data = await res.json();
    if (res.ok) setQuotes((current) => current.map((item) => (item.id === quote.id ? data.quote : item)));
    else setError(data.error ?? "Quote could not be updated");
  }

  async function createBooking(quote: MandateQuote) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          flightDate: quote.flightDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Booking could not be created");
      setBookings((current) => {
        const existing = current.some((booking) => booking.id === data.booking.id);
        return existing ? current.map((booking) => (booking.id === data.booking.id ? data.booking : booking)) : [data.booking, ...current];
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="Quote Inbox" subtitle="Contract-bound rate requests" />
      <main className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Inbox className="h-4 w-4" />} label="Total quotes" value={String(quotes.length)} />
          <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Airline approvals" value={String(pendingApprovalCount)} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={String(approvedCount)} />
          <StatCard icon={<PackageCheck className="h-4 w-4" />} label="Booked revenue" value={formatMoney(bookedRevenue)} />
        </section>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>New customer quote</CardTitle>
              <p className="mt-1 text-sm text-ink-muted">Create quotes only for routes assigned to your active contracts.</p>
            </div>
            <Button size="sm" onClick={() => setShowCreate((open) => !open)}>
              <Plus className="h-4 w-4" />
              New quote
            </Button>
          </CardHeader>
          {showCreate && (
            <CardContent className="space-y-4">
              {contracts.length === 0 ? (
                <div className="rounded-lg border border-border-ui bg-surface2 p-4 text-sm text-ink-muted">
                  No active contract routes are assigned yet.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Contract">
                      <Select value={form.contractId} onChange={(event) => {
                        const contract = contracts.find((item) => item.id === event.target.value);
                        setForm((current) => ({ ...current, contractId: event.target.value, routeId: contract ? firstAssignedRouteId(contract) : "" }));
                      }}>
                        {contracts.map((contract) => (
                          <option key={contract.id} value={contract.id}>{contract.airline} - {contract.market}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Assigned route">
                      <Select value={form.routeId} onChange={(event) => setForm((current) => ({ ...current, routeId: event.target.value }))}>
                        {(selectedContract?.contractRoutes.filter((route) => route.status === "assigned") ?? []).map((route) => (
                          <option key={route.id} value={route.id}>{route.origin}-{route.destination}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Rate EUR/kg">
                      <Input type="number" step="0.01" value={form.requestedRatePerKg} onChange={(event) => setForm((current) => ({ ...current, requestedRatePerKg: event.target.value }))} />
                    </Field>
                    <Field label="Floor">
                      <Input readOnly value={selectedContract?.controlRules?.rateFloorPerKg ? `EUR ${selectedContract.controlRules.rateFloorPerKg.toFixed(2)}/kg` : "No floor"} />
                    </Field>
                  </div>

                  {belowFloor && (
                    <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-bg p-3 text-sm text-warning">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      This quote is below the airline floor and will require airline approval before confirmation.
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Customer"><Input value={form.customer} onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))} /></Field>
                    <Field label="Contact name"><Input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} /></Field>
                    <Field label="Contact email"><Input type="email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} /></Field>
                    <Field label="Cargo type"><Input value={form.cargoType} onChange={(event) => setForm((current) => ({ ...current, cargoType: event.target.value }))} /></Field>
                    <Field label="Weight kg"><Input type="number" value={form.weightKg} onChange={(event) => setForm((current) => ({ ...current, weightKg: event.target.value }))} /></Field>
                    <Field label="Pieces"><Input type="number" value={form.pieces} onChange={(event) => setForm((current) => ({ ...current, pieces: event.target.value }))} /></Field>
                    <Field label="Flight date"><Input type="date" value={form.flightDate} onChange={(event) => setForm((current) => ({ ...current, flightDate: event.target.value }))} /></Field>
                    <Field label="Customer deadline"><Input type="datetime-local" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} /></Field>
                  </div>
                  <Button disabled={saving || !form.customer || !form.requestedRatePerKg || !form.routeId} onClick={submitQuote}>
                    <Send className="h-4 w-4" />
                    Submit quote
                  </Button>
                </>
              )}
            </CardContent>
          )}
        </Card>

        <div className="space-y-3">
          {quotes.length === 0 ? (
            <Card><CardContent className="p-8 text-sm text-ink-muted">No quotes yet. Create the first customer quote from an assigned route.</CardContent></Card>
          ) : quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              booking={bookingByQuoteId.get(quote.id)}
              saving={saving}
              onBook={() => createBooking(quote)}
              onCounter={() => actionQuote(quote, "counter")}
              onDecline={() => actionQuote(quote, "decline")}
            />
          ))}
        </div>
      </main>
    </>
  );
}

function firstAssignedRouteId(contract: LivePartnerContract) {
  return contract.contractRoutes.find((route) => route.status === "assigned")?.id ?? "";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>{children}</label>;
}

function QuoteCard({
  quote,
  booking,
  saving,
  onBook,
  onCounter,
  onDecline,
}: {
  quote: MandateQuote;
  booking?: MandateBooking;
  saving: boolean;
  onBook: () => void;
  onCounter: () => void;
  onDecline: () => void;
}) {
  const config = statusConfig[quote.status];
  const belowFloor = quote.floorRatePerKg ? quote.requestedRatePerKg < quote.floorRatePerKg : false;
  const canBook = quote.status === "auto-approved" || quote.status === "airline-approved";

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-ink">{quote.customer}</p>
              <Badge variant={config.variant}>{config.label}</Badge>
              {belowFloor && <Badge variant="warning">below floor</Badge>}
            </div>
            <p className="mt-1 text-sm text-ink-muted">{quote.origin}-{quote.destination} - {quote.cargoType} - {quote.weightKg.toLocaleString()} kg</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-ink">EUR {quote.requestedRatePerKg.toFixed(2)}/kg</p>
            <p className="text-xs text-ink-muted">Floor {quote.floorRatePerKg ? `EUR ${quote.floorRatePerKg.toFixed(2)}` : "not set"}</p>
          </div>
        </div>

        {quote.decisionReason && (
          <div className="rounded-lg border border-border-ui bg-surface2 p-3 text-sm text-ink-muted">{quote.decisionReason}</div>
        )}

        {booking && (
          <div className="grid gap-3 rounded-lg border border-success/25 bg-success-bg p-3 text-sm md:grid-cols-4">
            <Info label="AWB" value={booking.awbNumber} />
            <Info label="Revenue" value={formatMoney(booking.revenueAmount)} />
            <Info label="Rate" value={`EUR ${booking.ratePerKg.toFixed(2)}/kg`} />
            <Info label="Status" value={booking.status} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-ui pt-3">
          <p className="text-xs text-ink-muted">Contact: {quote.contactName} - {quote.contactEmail}</p>
          <div className="flex gap-2">
            {canBook && !booking && (
              <Button size="sm" onClick={onBook} disabled={saving}>
                <PackageCheck className="h-3.5 w-3.5" />
                Create booking
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onCounter} disabled={quote.status === "declined"}>
              Counter
            </Button>
            <Button size="sm" variant="ghost" onClick={onDecline} disabled={quote.status === "declined"}>
              <X className="h-3.5 w-3.5" />
              Decline
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatMoney(value: number) {
  return `EUR ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
