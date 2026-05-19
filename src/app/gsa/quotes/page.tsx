"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Inbox, Mail, PackageCheck, Plus, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerEmailExtraction } from "@/lib/services/customer-email-parser";
import type { MandateBooking, MandateQuote, MandateQuoteStatus } from "@/lib/services/mandate-execution-store";
import type { LiveContractRoute, LivePartnerContract } from "@/lib/services/tender-workflow-store";

type QuoteForm = {
  contractId: string;
  routeId: string;
  origin: string;
  destination: string;
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
  origin: "",
  destination: "",
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

type ParsedEmailResult = {
  provider: "openai" | "rules";
  confidence: number;
  extracted: CustomerEmailExtraction;
  match?: {
    contractId?: string;
    routeId?: string;
    routeOrigin?: string;
    routeDestination?: string;
    exactRouteMatch?: boolean;
  };
};

const statusConfig: Record<MandateQuoteStatus, { label: string; variant: "default" | "success" | "warning" | "muted" | "danger" }> = {
  draft: { label: "Draft", variant: "muted" },
  "auto-approved": { label: "Auto-approved", variant: "success" },
  "airline-approval-required": { label: "Airline approval", variant: "warning" },
  "airline-approved": { label: "Approved by airline", variant: "success" },
  "airline-rejected": { label: "Rejected by airline", variant: "danger" },
  countered: { label: "Countered", variant: "default" },
  declined: { label: "Declined", variant: "muted" },
  expired: { label: "Expired", variant: "danger" },
};

export default function QuotesPage() {
  const [contracts, setContracts] = useState<LivePartnerContract[]>([]);
  const [quotes, setQuotes] = useState<MandateQuote[]>([]);
  const [bookings, setBookings] = useState<MandateBooking[]>([]);
  const [form, setForm] = useState<QuoteForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [parsedEmail, setParsedEmail] = useState<ParsedEmailResult | null>(null);
  const [parsingEmail, setParsingEmail] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!form.contractId && contracts.length > 0) {
      const contract = contracts[0];
      const route = firstAssignedRoute(contract);
      setForm((current) => ({
        ...current,
        contractId: contract.id,
        routeId: route?.id ?? "",
        origin: route?.origin ?? current.origin,
        destination: route?.destination ?? current.destination,
      }));
    }
  }, [contracts, form.contractId]);

  const selectedContract = contracts.find((contract) => contract.id === form.contractId) ?? null;
  const selectedRoute = selectedContract?.contractRoutes.find((route) => route.id === form.routeId) ?? null;
  const pendingApprovalCount = quotes.filter((quote) => quote.status === "airline-approval-required").length;
  const expiredCount = quotes.filter((quote) => quote.status === "expired").length;
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
    if (!selectedContract) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          origin: form.origin || selectedRoute?.origin,
          destination: form.destination || selectedRoute?.destination,
          weightKg: Number(form.weightKg),
          pieces: Number(form.pieces),
          requestedRatePerKg: Number(form.requestedRatePerKg),
          sourceChannel: parsedEmail ? "customer-email" : "manual",
          sourceEmailText: parsedEmail ? emailText : undefined,
          sourceEmailProvider: parsedEmail?.provider,
          sourceEmailConfidence: parsedEmail?.confidence,
          dimensions: parsedEmail?.extracted.dimensions,
          volumeCbm: parsedEmail?.extracted.volumeCbm,
          readyDate: parsedEmail?.extracted.readyDate,
          product: parsedEmail?.extracted.product,
          routingPreference: parsedEmail?.extracted.routingPreference,
          transitRequirement: parsedEmail?.extracted.transitRequirement,
          dangerousGoods: parsedEmail?.extracted.dangerousGoods,
          unNumber: parsedEmail?.extracted.unNumber,
          dgClass: parsedEmail?.extracted.dgClass,
          packingInstruction: parsedEmail?.extracted.packingInstruction,
          temperatureRange: parsedEmail?.extracted.temperatureRange,
          handlingNotes: parsedEmail?.extracted.handlingNotes,
          requestedConfirmations: parsedEmail?.extracted.requestedConfirmations,
          priority: parsedEmail?.extracted.priority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote could not be created");
      setQuotes((current) => [data.quote, ...current]);
      setForm({
        ...emptyForm,
        contractId: selectedContract.id,
        routeId: selectedRoute?.id ?? "",
        origin: selectedRoute?.origin ?? "",
        destination: selectedRoute?.destination ?? "",
      });
      setParsedEmail(null);
      setEmailText("");
      setShowCreate(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function parseCustomerEmail(sample?: string) {
    const text = sample ?? emailText;
    if (!text.trim()) return;
    setParsingEmail(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText: text, contractId: form.contractId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Customer email could not be parsed");

      const result = data as ParsedEmailResult;
      const extracted = result.extracted;
      const matchedContract = contracts.find((contract) => contract.id === result.match?.contractId) ?? selectedContract ?? contracts[0] ?? null;
      const exactRoute = matchedContract?.contractRoutes.find((route) => route.id === result.match?.routeId && result.match?.exactRouteMatch) ?? null;
      const flightDate = normalizeOperationalDate(extracted.readyDate);

      setEmailText(text);
      setParsedEmail(result);
      setShowCreate(true);
      setForm((current) => ({
        ...current,
        contractId: matchedContract?.id ?? current.contractId,
        routeId: exactRoute?.id ?? "",
        origin: extracted.origin || exactRoute?.origin || current.origin,
        destination: extracted.destination || exactRoute?.destination || current.destination,
        customer: extracted.customer,
        contactName: extracted.contactName,
        contactEmail: extracted.contactEmail,
        cargoType: extracted.commodity,
        weightKg: extracted.chargeableWeightKg ? String(extracted.chargeableWeightKg) : "",
        pieces: extracted.pieces ? String(extracted.pieces) : "1",
        flightDate,
        deadline: defaultQuoteDeadline(),
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setParsingEmail(false);
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

  async function updateBooking(booking: MandateBooking, status: "flown" | "cancelled") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          flownWeightKg: status === "flown" ? booking.weightKg : undefined,
          finalRatePerKg: status === "flown" ? booking.ratePerKg : undefined,
          cancellationReason: status === "cancelled" ? "Cancelled by GSA operations" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Booking could not be updated");
      setBookings((current) => current.map((item) => (item.id === data.booking.id ? data.booking : item)));
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={<Inbox className="h-4 w-4" />} label="Total quotes" value={String(quotes.length)} />
          <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Airline approvals" value={String(pendingApprovalCount)} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={String(approvedCount)} />
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Expired" value={String(expiredCount)} />
          <StatCard icon={<PackageCheck className="h-4 w-4" />} label="Booked revenue" value={formatMoney(bookedRevenue)} />
        </section>

        <Card>
          <CardHeader className="flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand" />
                Customer email intake
              </CardTitle>
              <p className="mt-1 text-sm text-ink-muted">Paste a customer RFQ email, extract the cargo details, then send an offer from an assigned contract.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CUSTOMER_EMAIL_EXAMPLES.map((example, index) => (
                <Button
                  key={example.customer}
                  size="sm"
                  variant="outline"
                  onClick={() => parseCustomerEmail(example.text)}
                  disabled={parsingEmail}
                >
                  Option {index + 1}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={emailText}
              onChange={(event) => setEmailText(event.target.value)}
              rows={9}
              placeholder="Paste customer email..."
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {parsedEmail && (
                  <>
                    <Badge variant={parsedEmail.provider === "openai" ? "success" : "warning"}>
                      {parsedEmail.provider === "openai" ? "OpenAI extracted" : "Rule fallback"}
                    </Badge>
                    <Badge variant="muted">{Math.round(parsedEmail.confidence * 100)}% confidence</Badge>
                    {!parsedEmail.match?.exactRouteMatch && <Badge variant="warning">No exact assigned route match</Badge>}
                  </>
                )}
              </div>
              <Button onClick={() => parseCustomerEmail()} disabled={parsingEmail || !emailText.trim()}>
                <Sparkles className="h-4 w-4" />
                {parsingEmail ? "Extracting..." : "Extract RFQ"}
              </Button>
            </div>
            {parsedEmail && <ExtractedEmailPanel extracted={parsedEmail.extracted} />}
          </CardContent>
        </Card>

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
                        const route = contract ? firstAssignedRoute(contract) : null;
                        setForm((current) => ({
                          ...current,
                          contractId: event.target.value,
                          routeId: route?.id ?? "",
                          origin: route?.origin ?? current.origin,
                          destination: route?.destination ?? current.destination,
                        }));
                      }}>
                        {contracts.map((contract) => (
                          <option key={contract.id} value={contract.id}>{contract.airline} - {contract.market}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Assigned route">
                      <Select value={form.routeId} onChange={(event) => {
                        const route = selectedContract?.contractRoutes.find((item) => item.id === event.target.value);
                        setForm((current) => ({
                          ...current,
                          routeId: event.target.value,
                          origin: route?.origin ?? current.origin,
                          destination: route?.destination ?? current.destination,
                        }));
                      }}>
                        <option value="">No exact assigned route</option>
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
                    <Field label="Origin"><Input value={form.origin} onChange={(event) => setForm((current) => ({ ...current, origin: event.target.value.toUpperCase() }))} /></Field>
                    <Field label="Destination"><Input value={form.destination} onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value.toUpperCase() }))} /></Field>
                    <Field label="Customer"><Input value={form.customer} onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))} /></Field>
                    <Field label="Contact name"><Input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} /></Field>
                    <Field label="Contact email"><Input type="email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} /></Field>
                    <Field label="Cargo type"><Input value={form.cargoType} onChange={(event) => setForm((current) => ({ ...current, cargoType: event.target.value }))} /></Field>
                    <Field label="Weight kg"><Input type="number" value={form.weightKg} onChange={(event) => setForm((current) => ({ ...current, weightKg: event.target.value }))} /></Field>
                    <Field label="Pieces"><Input type="number" value={form.pieces} onChange={(event) => setForm((current) => ({ ...current, pieces: event.target.value }))} /></Field>
                    <Field label="Flight date"><Input type="date" value={form.flightDate} onChange={(event) => setForm((current) => ({ ...current, flightDate: event.target.value }))} /></Field>
                    <Field label="Customer deadline"><Input type="datetime-local" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} /></Field>
                  </div>
                  <Button disabled={saving || !form.customer || !form.requestedRatePerKg || !form.origin || !form.destination} onClick={submitQuote}>
                    <Send className="h-4 w-4" />
                    Accept and send offer
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
              onMarkFlown={(booking) => updateBooking(booking, "flown")}
              onCancel={(booking) => updateBooking(booking, "cancelled")}
              onCounter={() => actionQuote(quote, "counter")}
              onDecline={() => actionQuote(quote, "decline")}
            />
          ))}
        </div>
      </main>
    </>
  );
}

function firstAssignedRoute(contract: LivePartnerContract): LiveContractRoute | null {
  return contract.contractRoutes.find((route) => route.status === "assigned") ?? null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>{children}</label>;
}

function ExtractedEmailPanel({ extracted }: { extracted: CustomerEmailExtraction }) {
  return (
    <div className="grid gap-3 rounded-xl border border-border-ui bg-surface2 p-4 text-sm md:grid-cols-2 xl:grid-cols-4">
      <Info label="Customer" value={extracted.customer} />
      <Info label="Lane" value={`${extracted.origin || "-"}-${extracted.destination || "-"}`} />
      <Info label="Commodity" value={extracted.commodity} />
      <Info label="Product" value={extracted.product} />
      <Info label="Weight" value={`${extracted.chargeableWeightKg.toLocaleString()} kg`} />
      <Info label="Pieces" value={String(extracted.pieces)} />
      <Info label="Dimensions" value={extracted.dimensions || "-"} />
      <Info label="Ready" value={extracted.readyDate || "-"} />
      <div className="md:col-span-2 xl:col-span-4">
        <div className="flex flex-wrap gap-2">
          {extracted.dangerousGoods && <Badge variant="warning">DG {extracted.unNumber ?? ""} {extracted.dgClass ? `Class ${extracted.dgClass}` : ""}</Badge>}
          {extracted.temperatureRange && <Badge variant="success">Temp {extracted.temperatureRange}</Badge>}
          {extracted.volumeCbm && <Badge variant="muted">{extracted.volumeCbm} cbm</Badge>}
          <Badge variant={extracted.priority === "urgent" ? "danger" : extracted.priority === "priority" ? "warning" : "muted"}>
            {extracted.priority}
          </Badge>
        </div>
        {(extracted.handlingNotes.length > 0 || extracted.requestedConfirmations.length > 0) && (
          <p className="mt-3 text-xs text-ink-muted">
            {[...extracted.handlingNotes, ...extracted.requestedConfirmations].slice(0, 4).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

function QuoteCard({
  quote,
  booking,
  saving,
  onBook,
  onMarkFlown,
  onCancel,
  onCounter,
  onDecline,
}: {
  quote: MandateQuote;
  booking?: MandateBooking;
  saving: boolean;
  onBook: () => void;
  onMarkFlown: (booking: MandateBooking) => void;
  onCancel: (booking: MandateBooking) => void;
  onCounter: () => void;
  onDecline: () => void;
}) {
  const config = statusConfig[quote.status];
  const belowFloor = quote.floorRatePerKg ? quote.requestedRatePerKg < quote.floorRatePerKg : false;
  const canBook = quote.status === "auto-approved" || quote.status === "airline-approved";
  const deadlinePassed = quote.status === "expired";

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
            <p className={`mt-1 text-xs ${deadlinePassed ? "text-danger" : "text-ink-muted"}`}>
              Customer deadline: {formatDateTime(quote.deadline)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-ink">EUR {quote.requestedRatePerKg.toFixed(2)}/kg</p>
            <p className="text-xs text-ink-muted">Floor {quote.floorRatePerKg ? `EUR ${quote.floorRatePerKg.toFixed(2)}` : "not set"}</p>
          </div>
        </div>

        {quote.decisionReason && (
          <div className="rounded-lg border border-border-ui bg-surface2 p-3 text-sm text-ink-muted">{quote.decisionReason}</div>
        )}

        {quote.sourceChannel === "customer-email" && (
          <div className="rounded-lg border border-border-ui bg-surface2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted">Customer email</Badge>
              {quote.sourceEmailProvider && <Badge variant={quote.sourceEmailProvider === "openai" ? "success" : "warning"}>{quote.sourceEmailProvider}</Badge>}
              {quote.dangerousGoods && <Badge variant="warning">DG {quote.unNumber ?? ""}</Badge>}
              {quote.temperatureRange && <Badge variant="success">Temp {quote.temperatureRange}</Badge>}
              {quote.priority && <Badge variant={quote.priority === "urgent" ? "danger" : quote.priority === "priority" ? "warning" : "muted"}>{quote.priority}</Badge>}
            </div>
            <div className="mt-3 grid gap-2 text-xs text-ink-muted md:grid-cols-3">
              <span>Product: {quote.product || quote.cargoType}</span>
              <span>Dims: {quote.dimensions || "-"}</span>
              <span>Ready: {quote.readyDate || quote.flightDate}</span>
            </div>
            {(quote.routingPreference || quote.transitRequirement) && (
              <p className="mt-2 text-xs text-ink-muted">
                {[quote.routingPreference, quote.transitRequirement].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        )}

        {booking && (
          <div className="grid gap-3 rounded-lg border border-success/25 bg-success-bg p-3 text-sm md:grid-cols-4">
            <Info label="AWB" value={booking.awbNumber} />
            <Info label="Revenue" value={formatMoney(booking.revenueAmount)} />
            <Info label="Rate" value={`EUR ${booking.ratePerKg.toFixed(2)}/kg`} />
            <Info label="Status" value={`${booking.status} / ${booking.reconciliationStatus ?? "pending"}`} />
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
            {booking?.status === "booked" && (
              <>
                <Button size="sm" variant="outline" onClick={() => onMarkFlown(booking)} disabled={saving}>
                  Mark flown
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onCancel(booking)} disabled={saving}>
                  Cancel booking
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={onCounter} disabled={quote.status === "declined" || quote.status === "expired"}>
              Send counter-offer
            </Button>
            <Button size="sm" variant="ghost" onClick={onDecline} disabled={quote.status === "declined" || quote.status === "expired"}>
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

function normalizeOperationalDate(value: string) {
  const parsed = parseReadyDate(value);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const effective = parsed && parsed.getTime() > Date.now() ? parsed : tomorrow;
  return effective.toISOString().slice(0, 10);
}

function defaultQuoteDeadline() {
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + 24, 0, 0, 0);
  return toDateTimeLocal(deadline);
}

function toDateTimeLocal(value: Date) {
  const offsetMs = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseReadyDate(value: string) {
  if (!value.trim()) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = value.match(/(\d{1,2})\s+([A-Za-z]+)/);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(new Date().getUTCFullYear(), month, Number(match[1])));
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

const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const CUSTOMER_EMAIL_EXAMPLES = [
  {
    customer: "Atlas Components",
    text: `Dear Cargo Team,

Good day.

Please assist with your best net/net rate and space option for the shipment below:

Details
- Origin: Munich (MUC)
- Destination: Bangkok (BKK)
- Commodity: General Cargo (Industrial Components)
- Chargeable Weight: 2,350 kg
- Pieces / Dimensions: 6 pcs / 115 x 100 x 145 cm each
- Volume: approx. 10.0 cbm
- Ready Date: 28 May

Requirements
- Product: GCR
- Routing: Prefer fastest available connection
- Transit Time: Priority

Kindly advise:
- Rate + all-in charges
- Available flights / routing
- Space confirmation

Cargo is firm and can be booked immediately after customer approval.

Best regards,
Atlas Components`,
  },
  {
    customer: "BlueLine Logistics",
    text: `Dear Cargo Team,

Hope you are well.

We have a dangerous goods shipment and need your acceptance approval, rate, and space indication:

Shipment Details
- Origin: Abu Dhabi (AUH)
- Destination: Amsterdam (AMS)
- Commodity: Lithium Ion Batteries
- UN Number: UN3480
- Class: 9
- Packing Instruction: PI965 Section IA
- Chargeable Weight: 1,080 kg
- Pieces: 3 pallets
- Dimensions: 120 x 100 x 135 cm each
- Ready Date: 03 June

Handling
- Fully DG compliant with DGD available
- Shipper's Declaration and MSDS are ready

Kindly confirm:
- DG acceptance approval
- Rate (incl. DG surcharge)
- Available routing and transit time
- Space availability

Shipment is ready to move once acceptance and commercial approval are confirmed.

Best regards,
BlueLine Logistics`,
  },
  {
    customer: "MedBridge Forwarding",
    text: `Dear Cargo Team,

Good day.

We have a healthcare shipment requiring temperature-controlled handling. Please share your best available offer:

Shipment Details
- Origin: Basel (BSL)
- Destination: Riyadh (RUH)
- Commodity: Healthcare Products
- Product: Temp Control (+2 to +8°C)
- Chargeable Weight: 2,950 kg
- Pieces: 7 pallets
- Dimensions: 120 x 100 x 155 cm each
- Ready Date: 05 June

Requirements
- Active / Passive handling as per airline capability
- Temperature range strictly +2°C to +8°C
- Prefer direct flight or minimal transit exposure

Kindly provide:
- Pharma rate (incl. premium if applicable)
- Product confirmation (e.g. QEP / CEIV compliant handling)
- Routing & transit time
- Space confirmation

Shipment is high priority and time/temperature sensitive.

Looking forward to your quick support.

Best regards,
MedBridge Forwarding`,
  },
] as const;
