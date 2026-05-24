"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Inbox, Link2, Loader2, Mail, MessageSquare, PackageCheck, Plus, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { AirportCodePicker, CargoProductSelect } from "@/components/dashboard/freight-field-selects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerEmailExtraction } from "@/lib/services/customer-email-parser";
import { normalizeCargoProduct } from "@/lib/constants/cargo-products";
import type { MandateBooking, MandateQuote, MandateQuoteStatus } from "@/lib/services/mandate-execution-store";
import type { QuoteRoom } from "@/lib/services/quote-room-store";
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

type CounterDraft = {
  open: boolean;
  rate: string;
  note: string;
};

type ConversationState = {
  label: string;
  variant: "default" | "success" | "warning" | "muted" | "danger";
  tone: "default" | "success" | "warning" | "muted" | "danger";
};

type CustomerConversation = {
  key: string;
  customer: string;
  contactName: string;
  contactEmail: string;
  rooms: QuoteRoom[];
  quotes: MandateQuote[];
  latestAt: string;
  latestMessage?: QuoteRoom["messages"][number];
  state: ConversationState;
  completed: boolean;
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

const QUICK_REPLIES = [
  "Thanks, we are checking space and will confirm shortly.",
  "Rate is subject to final space and screening confirmation.",
  "Please share final pieces, dimensions, and ready date.",
];

export default function QuotesPage() {
  const [contracts, setContracts] = useState<LivePartnerContract[]>([]);
  const [quotes, setQuotes] = useState<MandateQuote[]>([]);
  const [bookings, setBookings] = useState<MandateBooking[]>([]);
  const [form, setForm] = useState<QuoteForm>(emptyForm);
  const [quoteRooms, setQuoteRooms] = useState<QuoteRoom[]>([]);
  const [roomLinks, setRoomLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEmailIntake, setShowEmailIntake] = useState(false);
  const [showCompletedRooms, setShowCompletedRooms] = useState(false);
  const [selectedConversationKey, setSelectedConversationKey] = useState<string | null>(null);
  const [emailText, setEmailText] = useState("");
  const [parsedEmail, setParsedEmail] = useState<ParsedEmailResult | null>(null);
  const [parsingEmail, setParsingEmail] = useState(false);
  const [counterDrafts, setCounterDrafts] = useState<Record<string, CounterDraft>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    void refresh({ initial: true });
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
  const approvedCount = quotes.filter((quote) => quote.status === "auto-approved" || quote.status === "airline-approved").length;
  const bookedRevenue = bookings.reduce((sum, booking) => sum + booking.revenueAmount, 0);
  const bookingByQuoteId = new Map(bookings.map((booking) => [booking.quoteId, booking]));
  const roomByQuoteId = new Map(quoteRooms.map((room) => [room.quoteId, room]));
  const conversations = useMemo(() => buildCustomerConversations(quoteRooms, quotes), [quoteRooms, quotes]);
  const activeConversations = useMemo(() => conversations.filter((conversation) => !conversation.completed), [conversations]);
  const completedConversations = useMemo(() => conversations.filter((conversation) => conversation.completed), [conversations]);
  const selectedConversation =
    conversations.find((conversation) => conversation.key === selectedConversationKey) ??
    activeConversations[0] ??
    completedConversations[0] ??
    null;
  const roomsNeedingReply = quoteRooms.filter((room) => getConversationState(room).tone === "warning").length;
  const belowFloor = selectedContract?.controlRules?.rateFloorPerKg && Number(form.requestedRatePerKg)
    ? Number(form.requestedRatePerKg) < selectedContract.controlRules.rateFloorPerKg
    : false;

  useEffect(() => {
    if (selectedConversationKey && conversations.some((conversation) => conversation.key === selectedConversationKey)) return;
    setSelectedConversationKey(activeConversations[0]?.key ?? completedConversations[0]?.key ?? null);
  }, [activeConversations, completedConversations, conversations, selectedConversationKey]);

  async function refresh(options: { initial?: boolean } = {}) {
    if (options.initial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [contractRes, quoteRes, bookingRes, roomRes] = await Promise.all([
        fetch("/api/contracts", { cache: "no-store" }),
        fetch("/api/quotes", { cache: "no-store" }),
        fetch("/api/bookings", { cache: "no-store" }),
        fetch("/api/quote-rooms", { cache: "no-store" }),
      ]);
      const [contractData, quoteData, bookingData, roomData] = await Promise.all([
        contractRes.json(),
        quoteRes.json(),
        bookingRes.json(),
        roomRes.json(),
      ]);
      if (!contractRes.ok) throw new Error(contractData.error ?? "Contracts could not be loaded");
      if (!quoteRes.ok) throw new Error(quoteData.error ?? "Quotes could not be loaded");
      if (!bookingRes.ok) throw new Error(bookingData.error ?? "Bookings could not be loaded");
      if (!roomRes.ok) throw new Error(roomData.error ?? "Customer rooms could not be loaded");
      setContracts(contractData.contracts ?? []);
      setQuotes(quoteData.quotes ?? []);
      setBookings(bookingData.bookings ?? []);
      setQuoteRooms(roomData.rooms ?? []);
      setRoomLinks(roomData.links ?? {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
      if (parsedEmail) {
        const roomResult = await createCustomerRoom(data.quote, true, true);
        if (roomResult?.email?.status === "failed") {
          setNotice(`Customer room created, but email failed. Use the visible room link instead: ${roomResult.email.error ?? "provider rejected the email"}`);
        } else {
          setNotice("Customer room created and the rate-offer link is ready.");
        }
      } else {
        setNotice("Quote created. Create a customer room when you want to negotiate externally.");
      }
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

  async function createCustomerRoom(quote: MandateQuote, sendInvite = false, createInitialOffer = false) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/quote-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.id, sendInvite, createInitialOffer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Customer room could not be created");
      setQuoteRooms((current) => {
        const exists = current.some((room) => room.id === data.room.id);
        return exists ? current.map((room) => (room.id === data.room.id ? data.room : room)) : [data.room, ...current];
      });
      setRoomLinks((current) => ({ ...current, [data.room.id]: data.publicUrl }));
      if (sendInvite && data.email?.status === "failed") {
        setNotice(`Customer link created, but email failed. Share the room link manually.`);
      } else if (sendInvite) {
        setNotice("Customer link created and invite email processed.");
      } else {
        setNotice("Customer link created.");
      }
      return data as { room: QuoteRoom; publicUrl: string; email?: { status: string; error?: string } };
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function sendOfferBlock(quote: MandateQuote, room: QuoteRoom) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/quote-rooms/${room.id}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ratePerKg: quote.counterRatePerKg ?? quote.requestedRatePerKg,
          routing: quote.routingPreference || `${quote.origin}-${quote.destination}`,
          transitTime: quote.transitRequirement || "Fastest available confirmed option",
          notes: buildOfferNotes(quote),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rate offer could not be sent");
      setQuoteRooms((current) => current.map((item) => (item.id === data.room.id ? data.room : item)));
      setRoomLinks((current) => ({ ...current, [data.room.id]: data.publicUrl }));
      setNotice("Rate offer block sent to the customer room.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function sendTeamMessage(room: QuoteRoom) {
    const body = messageDrafts[room.id]?.trim();
    if (!body) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/quote-rooms/${room.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Message could not be sent");
      setQuoteRooms((current) => current.map((item) => (item.id === data.room.id ? data.room : item)));
      setMessageDrafts((current) => ({ ...current, [room.id]: "" }));
      setNotice("Message sent to the customer room.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function openCounterDraft(quote: MandateQuote) {
    setCounterDrafts((current) => ({
      ...current,
      [quote.id]: { ...(current[quote.id] ?? defaultCounterDraft(quote)), open: true },
    }));
  }

  function updateCounterDraft(quoteId: string, patch: Partial<CounterDraft>) {
    setCounterDrafts((current) => ({
      ...current,
      [quoteId]: {
        ...(current[quoteId] ?? { open: true, rate: "", note: "" }),
        ...patch,
      },
    }));
  }

  function closeCounterDraft(quoteId: string) {
    setCounterDrafts((current) => ({
      ...current,
      [quoteId]: { ...(current[quoteId] ?? { open: false, rate: "", note: "" }), open: false },
    }));
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
        cargoType: normalizeCargoProduct(extracted.product || extracted.commodity),
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

  async function submitCounterOffer(quote: MandateQuote) {
    const draft = counterDrafts[quote.id] ?? defaultCounterDraft(quote);
    const rate = Number(draft.rate.replace(",", "."));
    if (!Number.isFinite(rate) || rate <= 0) {
      setError("Counter rate must be greater than zero");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const quoteRes = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "counter",
          reason: draft.note || "GSA sent counter-offer to customer.",
          counterRatePerKg: rate,
        }),
      });
      const quoteData = await quoteRes.json();
      if (!quoteRes.ok) throw new Error(quoteData.error ?? "Counter-offer could not be saved");
      setQuotes((current) => current.map((item) => (item.id === quote.id ? quoteData.quote : item)));

      let room = roomByQuoteId.get(quote.id);
      if (!room) {
        const roomRes = await fetch("/api/quote-rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quoteId: quote.id, sendInvite: false, createInitialOffer: false }),
        });
        const roomData = await roomRes.json();
        if (!roomRes.ok) throw new Error(roomData.error ?? "Customer room could not be created");
        room = roomData.room;
        setQuoteRooms((current) => {
          const exists = current.some((item) => item.id === roomData.room.id);
          return exists ? current.map((item) => (item.id === roomData.room.id ? roomData.room : item)) : [roomData.room, ...current];
        });
        setRoomLinks((current) => ({ ...current, [roomData.room.id]: roomData.publicUrl }));
      }
      if (!room) throw new Error("Customer room could not be created");

      const offerRes = await fetch(`/api/quote-rooms/${room.id}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ratePerKg: rate,
          routing: quote.routingPreference || `${quote.origin}-${quote.destination}`,
          transitTime: quote.transitRequirement || "Fastest available confirmed option",
          notes: draft.note || buildOfferNotes({ ...quote, counterRatePerKg: rate }),
        }),
      });
      const offerData = await offerRes.json();
      if (!offerRes.ok) throw new Error(offerData.error ?? "Counter-offer could not be sent to the customer room");
      setQuoteRooms((current) => current.map((item) => (item.id === offerData.room.id ? offerData.room : item)));
      setRoomLinks((current) => ({ ...current, [offerData.room.id]: offerData.publicUrl }));
      closeCounterDraft(quote.id);
      setNotice("Counter-offer saved and sent into the customer room.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function actionQuote(quote: MandateQuote, action: "decline") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: "GSA declined the customer request." }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote could not be updated");
      setQuotes((current) => current.map((item) => (item.id === quote.id ? data.quote : item)));
      setNotice("Quote declined.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return (
      <>
        <Topbar title="Quote Inbox" subtitle="Contract-bound rate requests" />
        <main className="space-y-5 p-5">
          <QuoteInboxLoading />
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Quote Inbox" subtitle="Contract-bound rate requests" />
      <main className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}
        {notice && <div className="rounded-lg border border-success/25 bg-success-bg p-3 text-sm text-success">{notice}</div>}

        <section className="rounded-2xl border border-border-ui bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">Customer desk</p>
              <h2 className="mt-1 text-2xl font-bold text-ink">Forwarder conversations</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink-muted">
                Work from the customer thread first. Import emails and manual quotes are available only when you need them.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShowCreate((open) => !open)}>
                <Plus className="h-4 w-4" />
                New quote
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowEmailIntake((open) => !open)}>
                <Mail className="h-4 w-4" />
                Import email
              </Button>
              <Button size="sm" variant="outline" onClick={() => refresh()} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Badge variant={roomsNeedingReply > 0 ? "warning" : "success"}>{roomsNeedingReply} need reply</Badge>
            <Badge variant="muted">{activeConversations.length} active conversations</Badge>
            <Badge variant="muted">{pendingApprovalCount} airline approvals</Badge>
            <Badge variant="muted">{approvedCount} approved quotes</Badge>
            <Badge variant="muted">{formatMoney(bookedRevenue)} booked</Badge>
            <span className="ml-auto flex items-center gap-2 text-ink-muted">
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              {refreshing ? "Updating live inbox..." : "Live inbox connected"}
            </span>
          </div>
        </section>

        <ConversationWorkspace
          activeConversations={activeConversations}
          completedConversations={completedConversations}
          selectedConversation={selectedConversation}
          selectedConversationKey={selectedConversationKey}
          showCompleted={showCompletedRooms}
          roomLinks={roomLinks}
          roomByQuoteId={roomByQuoteId}
          bookingByQuoteId={bookingByQuoteId}
          saving={saving}
          counterDrafts={counterDrafts}
          messageDrafts={messageDrafts}
          onSelect={setSelectedConversationKey}
          onToggleCompleted={() => setShowCompletedRooms((open) => !open)}
          onCreateRoom={(quote) => createCustomerRoom(quote, false, false)}
          onInvite={(quote) => createCustomerRoom(quote, true, true)}
          onSendOffer={(quote, room) => sendOfferBlock(quote, room)}
          onMessageDraftChange={(roomId, value) => setMessageDrafts((current) => ({ ...current, [roomId]: value }))}
          onSendMessage={sendTeamMessage}
          onBook={createBooking}
          onStartCounter={openCounterDraft}
          onCounterDraftChange={updateCounterDraft}
          onSubmitCounter={submitCounterOffer}
          onCancelCounter={closeCounterDraft}
          onDecline={(quote) => actionQuote(quote, "decline")}
          onOpenCreate={() => setShowCreate(true)}
          onOpenEmail={() => setShowEmailIntake(true)}
        />

        {showEmailIntake && <Card>
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
        </Card>}

        {showCreate && <Card>
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
                    <Field label="Origin"><AirportCodePicker value={form.origin} onChange={(value) => setForm((current) => ({ ...current, origin: value }))} /></Field>
                    <Field label="Destination"><AirportCodePicker value={form.destination} onChange={(value) => setForm((current) => ({ ...current, destination: value }))} /></Field>
                    <Field label="Customer"><Input value={form.customer} onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))} /></Field>
                    <Field label="Contact name"><Input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} /></Field>
                    <Field label="Contact email"><Input type="email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} /></Field>
                    <Field label="Cargo type"><CargoProductSelect value={form.cargoType} onChange={(value) => setForm((current) => ({ ...current, cargoType: value }))} /></Field>
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
        </Card>}
      </main>
    </>
  );
}

function firstAssignedRoute(contract: LivePartnerContract): LiveContractRoute | null {
  return contract.contractRoutes.find((route) => route.status === "assigned") ?? null;
}

function defaultCounterDraft(quote: MandateQuote): CounterDraft {
  const rate = quote.counterRatePerKg ?? Math.max(quote.floorRatePerKg ?? quote.requestedRatePerKg, quote.requestedRatePerKg);
  return {
    open: true,
    rate: formatRateInput(rate),
    note: buildOfferNotes(quote),
  };
}

function buildOfferNotes(quote: MandateQuote) {
  const notes = [
    quote.product ? `${quote.product} handling included.` : undefined,
    quote.temperatureRange ? `Temperature requirement ${quote.temperatureRange} included subject to station acceptance.` : undefined,
    quote.dangerousGoods ? `DG acceptance required${quote.unNumber ? ` for ${quote.unNumber}` : ""}${quote.dgClass ? ` class ${quote.dgClass}` : ""}.` : undefined,
    quote.transitRequirement ? `Transit requirement: ${quote.transitRequirement}.` : undefined,
    "Subject to final space confirmation and screening status.",
  ].filter(Boolean);
  return notes.join(" ");
}

function formatRateInput(rate: number) {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(2);
}

function getLatestRoomMessage(room: QuoteRoom) {
  return [...room.messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
}

function getConversationState(room: QuoteRoom): {
  label: string;
  variant: "default" | "success" | "warning" | "muted" | "danger";
  tone: "default" | "success" | "warning" | "muted" | "danger";
} {
  if (room.status === "accepted") return { label: "Accepted", variant: "success", tone: "success" };
  if (room.status === "rejected" || room.status === "closed") return { label: room.status, variant: "danger", tone: "danger" };
  const latest = getLatestRoomMessage(room);
  if (latest?.actor === "customer") return { label: "Needs reply", variant: "warning", tone: "warning" };
  if (room.offers.some((offer) => offer.status === "sent")) return { label: "Waiting on customer", variant: "default", tone: "default" };
  return { label: "Room ready", variant: "muted", tone: "muted" };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>{children}</label>;
}

function buildCustomerConversations(rooms: QuoteRoom[], quotes: MandateQuote[]): CustomerConversation[] {
  const groups = new Map<string, Omit<CustomerConversation, "latestAt" | "latestMessage" | "state" | "completed">>();

  function ensureGroup(seed: { customer?: string; contactName?: string; contactEmail?: string; fallbackKey: string }) {
    const key = conversationKey(seed.contactEmail, seed.customer || seed.fallbackKey);
    const existing = groups.get(key);
    if (existing) {
      existing.customer = existing.customer || seed.customer || "Unknown customer";
      existing.contactName = existing.contactName || seed.contactName || "";
      existing.contactEmail = existing.contactEmail || seed.contactEmail || "";
      return existing;
    }
    const group = {
      key,
      customer: seed.customer || "Unknown customer",
      contactName: seed.contactName || "",
      contactEmail: seed.contactEmail || "",
      rooms: [] as QuoteRoom[],
      quotes: [] as MandateQuote[],
    };
    groups.set(key, group);
    return group;
  }

  for (const room of rooms) {
    ensureGroup({
      customer: room.customer,
      contactName: room.contactName,
      contactEmail: room.contactEmail,
      fallbackKey: room.id,
    }).rooms.push(room);
  }

  for (const quote of quotes) {
    ensureGroup({
      customer: quote.customer,
      contactName: quote.contactName,
      contactEmail: quote.contactEmail,
      fallbackKey: quote.id,
    }).quotes.push(quote);
  }

  return [...groups.values()]
    .map((group) => {
      const latestMessage = group.rooms
        .flatMap((room) => room.messages)
        .sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt))[0];
      const latestAt = newestDate([
        ...group.rooms.map((room) => room.lastMessageAt),
        ...group.quotes.map((quote) => quote.deadline || quote.flightDate),
      ]);
      const state = getGroupedConversationState(group.rooms, group.quotes);
      return {
        ...group,
        latestAt,
        latestMessage,
        state,
        completed: state.tone === "success" || state.tone === "danger",
      };
    })
    .sort((a, b) => {
      const priority = statePriority(b.state) - statePriority(a.state);
      return priority !== 0 ? priority : safeTime(b.latestAt) - safeTime(a.latestAt);
    });
}

function conversationKey(email: string | undefined, fallback: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) return normalizedEmail;
  return `customer:${fallback.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function newestDate(values: string[]) {
  const latest = values.map(safeTime).filter((value) => Number.isFinite(value)).sort((a, b) => b - a)[0];
  return latest ? new Date(latest).toISOString() : new Date(0).toISOString();
}

function safeTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function statePriority(state: ConversationState) {
  if (state.tone === "warning") return 5;
  if (state.tone === "default") return 4;
  if (state.tone === "muted") return 3;
  if (state.tone === "success") return 2;
  return 1;
}

function getGroupedConversationState(rooms: QuoteRoom[], quotes: MandateQuote[]): ConversationState {
  if (rooms.some((room) => room.status === "accepted")) return { label: "Accepted", variant: "success", tone: "success" };
  if (rooms.length > 0 && rooms.every((room) => room.status === "rejected" || room.status === "closed")) {
    return { label: "Closed", variant: "danger", tone: "danger" };
  }
  if (quotes.length > 0 && quotes.every((quote) => quote.status === "declined" || quote.status === "expired" || quote.status === "airline-rejected")) {
    return { label: "Closed", variant: "danger", tone: "danger" };
  }
  if (rooms.some((room) => getConversationState(room).tone === "warning")) return { label: "Needs reply", variant: "warning", tone: "warning" };
  if (rooms.some((room) => room.offers.some((offer) => offer.status === "sent"))) {
    return { label: "Waiting on customer", variant: "default", tone: "default" };
  }
  if (rooms.length > 0) return { label: "Room ready", variant: "muted", tone: "muted" };
  return { label: "Create customer link", variant: "warning", tone: "warning" };
}

function ConversationWorkspace({
  activeConversations,
  completedConversations,
  selectedConversation,
  selectedConversationKey,
  showCompleted,
  roomLinks,
  roomByQuoteId,
  bookingByQuoteId,
  saving,
  counterDrafts,
  messageDrafts,
  onSelect,
  onToggleCompleted,
  onCreateRoom,
  onInvite,
  onSendOffer,
  onMessageDraftChange,
  onSendMessage,
  onBook,
  onStartCounter,
  onCounterDraftChange,
  onSubmitCounter,
  onCancelCounter,
  onDecline,
  onOpenCreate,
  onOpenEmail,
}: {
  activeConversations: CustomerConversation[];
  completedConversations: CustomerConversation[];
  selectedConversation: CustomerConversation | null;
  selectedConversationKey: string | null;
  showCompleted: boolean;
  roomLinks: Record<string, string>;
  roomByQuoteId: Map<string, QuoteRoom>;
  bookingByQuoteId: Map<string, MandateBooking>;
  saving: boolean;
  counterDrafts: Record<string, CounterDraft>;
  messageDrafts: Record<string, string>;
  onSelect: (key: string) => void;
  onToggleCompleted: () => void;
  onCreateRoom: (quote: MandateQuote) => void;
  onInvite: (quote: MandateQuote) => void;
  onSendOffer: (quote: MandateQuote, room: QuoteRoom) => void;
  onMessageDraftChange: (roomId: string, value: string) => void;
  onSendMessage: (room: QuoteRoom) => void;
  onBook: (quote: MandateQuote) => void;
  onStartCounter: (quote: MandateQuote) => void;
  onCounterDraftChange: (quoteId: string, patch: Partial<CounterDraft>) => void;
  onSubmitCounter: (quote: MandateQuote) => void;
  onCancelCounter: (quoteId: string) => void;
  onDecline: (quote: MandateQuote) => void;
  onOpenCreate: () => void;
  onOpenEmail: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-brand" />
            Customer threads
          </CardTitle>
          <p className="mt-1 text-sm text-ink-muted">One conversation per customer email. Start here, then open the customer room only when needed.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeConversations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-ui bg-surface2 p-5 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-ink-muted/60" />
              <p className="mt-3 font-semibold text-ink">No active customer threads</p>
              <p className="mt-1 text-sm text-ink-muted">Create a quote manually or import an RFQ email.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button size="sm" onClick={onOpenCreate}>New quote</Button>
                <Button size="sm" variant="outline" onClick={onOpenEmail}>Import email</Button>
              </div>
            </div>
          ) : (
            activeConversations.map((conversation) => (
              <ConversationListItem
                key={conversation.key}
                conversation={conversation}
                selected={conversation.key === selectedConversationKey}
                onSelect={() => onSelect(conversation.key)}
              />
            ))
          )}

          {completedConversations.length > 0 && (
            <div className="border-t border-border-ui pt-3">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-ink hover:bg-surface2"
                onClick={onToggleCompleted}
              >
                Completed
                <Badge variant="muted">{completedConversations.length}</Badge>
              </button>
              {showCompleted && (
                <div className="mt-2 space-y-2">
                  {completedConversations.map((conversation) => (
                    <ConversationListItem
                      key={conversation.key}
                      conversation={conversation}
                      selected={conversation.key === selectedConversationKey}
                      onSelect={() => onSelect(conversation.key)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConversationDetail
        conversation={selectedConversation}
        roomLinks={roomLinks}
        roomByQuoteId={roomByQuoteId}
        bookingByQuoteId={bookingByQuoteId}
        saving={saving}
        counterDrafts={counterDrafts}
        messageDrafts={messageDrafts}
        onCreateRoom={onCreateRoom}
        onInvite={onInvite}
        onSendOffer={onSendOffer}
        onMessageDraftChange={onMessageDraftChange}
        onSendMessage={onSendMessage}
        onBook={onBook}
        onStartCounter={onStartCounter}
        onCounterDraftChange={onCounterDraftChange}
        onSubmitCounter={onSubmitCounter}
        onCancelCounter={onCancelCounter}
        onDecline={onDecline}
        onOpenCreate={onOpenCreate}
        onOpenEmail={onOpenEmail}
      />
    </section>
  );
}

function ConversationListItem({
  conversation,
  selected,
  onSelect,
}: {
  conversation: CustomerConversation;
  selected: boolean;
  onSelect: () => void;
}) {
  const latestPreview = conversation.latestMessage?.body ?? `${conversation.quotes.length} quote${conversation.quotes.length === 1 ? "" : "s"} in this thread`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected ? "border-brand bg-brand-light shadow-sm" : "border-border-ui bg-surface2 hover:border-brand/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{conversation.customer}</p>
          <p className="mt-0.5 truncate text-xs text-ink-muted">{conversation.contactEmail || conversation.contactName || "No email on file"}</p>
        </div>
        <Badge variant={conversation.state.variant}>{conversation.state.label}</Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{latestPreview}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
        <span>{conversation.rooms.length} room{conversation.rooms.length === 1 ? "" : "s"} / {conversation.quotes.length} quote{conversation.quotes.length === 1 ? "" : "s"}</span>
        <span>{formatDateTime(conversation.latestAt)}</span>
      </div>
    </button>
  );
}

function ConversationDetail({
  conversation,
  roomLinks,
  roomByQuoteId,
  bookingByQuoteId,
  saving,
  counterDrafts,
  messageDrafts,
  onCreateRoom,
  onInvite,
  onSendOffer,
  onMessageDraftChange,
  onSendMessage,
  onBook,
  onStartCounter,
  onCounterDraftChange,
  onSubmitCounter,
  onCancelCounter,
  onDecline,
  onOpenCreate,
  onOpenEmail,
}: {
  conversation: CustomerConversation | null;
  roomLinks: Record<string, string>;
  roomByQuoteId: Map<string, QuoteRoom>;
  bookingByQuoteId: Map<string, MandateBooking>;
  saving: boolean;
  counterDrafts: Record<string, CounterDraft>;
  messageDrafts: Record<string, string>;
  onCreateRoom: (quote: MandateQuote) => void;
  onInvite: (quote: MandateQuote) => void;
  onSendOffer: (quote: MandateQuote, room: QuoteRoom) => void;
  onMessageDraftChange: (roomId: string, value: string) => void;
  onSendMessage: (room: QuoteRoom) => void;
  onBook: (quote: MandateQuote) => void;
  onStartCounter: (quote: MandateQuote) => void;
  onCounterDraftChange: (quoteId: string, patch: Partial<CounterDraft>) => void;
  onSubmitCounter: (quote: MandateQuote) => void;
  onCancelCounter: (quoteId: string) => void;
  onDecline: (quote: MandateQuote) => void;
  onOpenCreate: () => void;
  onOpenEmail: () => void;
}) {
  if (!conversation) {
    return (
      <Card>
        <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
          <Inbox className="h-10 w-10 text-ink-muted/60" />
          <p className="mt-4 text-lg font-semibold text-ink">No customer conversation selected</p>
          <p className="mt-2 max-w-md text-sm text-ink-muted">Import a customer email or create the first quote. The conversation will stay grouped by customer email.</p>
          <div className="mt-5 flex gap-2">
            <Button onClick={onOpenCreate}>New quote</Button>
            <Button variant="outline" onClick={onOpenEmail}>Import email</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestRoom = [...conversation.rooms].sort((a, b) => safeTime(b.lastMessageAt) - safeTime(a.lastMessageAt))[0];
  const latestOffer = latestRoom?.offers.find((offer) => offer.status === "sent") ?? latestRoom?.offers[0];
  const threadMessages = latestRoom ? [...latestRoom.messages].sort((a, b) => safeTime(a.createdAt) - safeTime(b.createdAt)) : [];
  const customerRoomHref = latestRoom ? (roomLinks[latestRoom.id] || `/quote-room/${encodeURIComponent(latestRoom.publicToken)}`) : null;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 border-b border-border-ui pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">Conversation</p>
              <Badge variant={conversation.state.variant}>{conversation.state.label}</Badge>
            </div>
            <h3 className="mt-2 text-2xl font-bold text-ink">{conversation.customer}</h3>
            <p className="mt-1 text-sm text-ink-muted">
              {[conversation.contactName, conversation.contactEmail].filter(Boolean).join(" - ") || "No contact details saved yet"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniMetric label="Quotes" value={String(conversation.quotes.length)} />
            <MiniMetric label="Rooms" value={String(conversation.rooms.length)} />
            <MiniMetric label="Latest" value={formatDateTime(conversation.latestAt)} />
          </div>
        </div>

        {conversation.state.tone === "warning" && (
          <div className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning-bg p-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {conversation.rooms.length === 0
                ? "Create a secure customer link before negotiation moves outside the platform."
                : "This customer has the next move waiting on your team."}
            </span>
          </div>
        )}

        {conversation.latestMessage && (
          <div className="rounded-xl border border-border-ui bg-surface2 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                Latest {conversation.latestMessage.actor === "customer" ? "customer message" : "team update"}
              </p>
              <p className="text-xs text-ink-muted">{formatDateTime(conversation.latestMessage.createdAt)}</p>
            </div>
            <p className="mt-2 text-sm text-ink-muted">{conversation.latestMessage.body}</p>
          </div>
        )}

        {latestOffer && (
          <div className="grid gap-3 rounded-xl border border-brand/20 bg-brand-light p-4 md:grid-cols-4">
            <Info label="Last rate block" value={`EUR ${latestOffer.ratePerKg.toFixed(2)}/kg`} />
            <Info label="Routing" value={latestOffer.routing || "-"} />
            <Info label="Transit" value={latestOffer.transitTime || "-"} />
            <Info label="Status" value={latestOffer.status} />
          </div>
        )}

        <div className="rounded-xl border border-border-ui bg-surface2">
          <div className="flex flex-col gap-2 border-b border-border-ui p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-ink">Chat with customer</p>
              <p className="text-sm text-ink-muted">Reply here as the GSA team. The forwarder sees the same thread in the secure customer room.</p>
            </div>
            {customerRoomHref && (
              <Button asChild size="sm" variant="outline">
                <a href={customerRoomHref} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Customer view
                </a>
              </Button>
            )}
          </div>

          {!latestRoom ? (
            <div className="p-4">
              <div className="rounded-lg border border-warning/25 bg-warning-bg p-3 text-sm text-warning">
                Create the secure customer link first. After that you can continue the chat directly from this inbox.
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {threadMessages.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border-ui bg-surface p-4 text-center text-sm text-ink-muted">
                    No messages yet. Send the first update or rate context below.
                  </p>
                ) : (
                  threadMessages.map((message) => <ThreadMessageBubble key={message.id} message={message} />)
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((reply) => (
                  <Button
                    key={reply}
                    size="sm"
                    variant="ghost"
                    onClick={() => onMessageDraftChange(latestRoom.id, reply)}
                    disabled={saving}
                  >
                    {reply}
                  </Button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <Textarea
                  rows={3}
                  value={messageDrafts[latestRoom.id] ?? ""}
                  onChange={(event) => onMessageDraftChange(latestRoom.id, event.target.value)}
                  placeholder="Write to the customer, e.g. space is available, DG approval pending, or revised rate follows..."
                />
                <Button onClick={() => onSendMessage(latestRoom)} disabled={saving || !(messageDrafts[latestRoom.id] ?? "").trim()}>
                  <Send className="h-4 w-4" />
                  Send reply
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">Quotes in this conversation</p>
              <p className="text-sm text-ink-muted">Handle the next commercial action from one place.</p>
            </div>
            <Badge variant="muted">{conversation.quotes.length} quote{conversation.quotes.length === 1 ? "" : "s"}</Badge>
          </div>

          {conversation.quotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-ui bg-surface2 p-6 text-center text-sm text-ink-muted">
              This customer room has no linked quote. Create a quote from the next customer RFQ.
            </div>
          ) : (
            conversation.quotes.map((quote) => (
              <ConversationQuoteRow
                key={quote.id}
                quote={quote}
                booking={bookingByQuoteId.get(quote.id)}
                room={roomByQuoteId.get(quote.id)}
                saving={saving}
                counterDraft={counterDrafts[quote.id]}
                onCreateRoom={() => onCreateRoom(quote)}
                onInvite={() => onInvite(quote)}
                onSendOffer={(room) => onSendOffer(quote, room)}
                onBook={() => onBook(quote)}
                onStartCounter={() => onStartCounter(quote)}
                onCounterDraftChange={(patch) => onCounterDraftChange(quote.id, patch)}
                onSubmitCounter={() => onSubmitCounter(quote)}
                onCancelCounter={() => onCancelCounter(quote.id)}
                onDecline={() => onDecline(quote)}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 px-3 py-2">
      <p className="text-sm font-bold text-ink">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
    </div>
  );
}

function ThreadMessageBubble({ message }: { message: QuoteRoom["messages"][number] }) {
  const isTeam = message.actor === "gsa";
  const isSystem = message.actor === "system";
  return (
    <div className={`flex ${isTeam ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl border px-4 py-3 text-sm ${
          isSystem
            ? "border-border-ui bg-surface text-ink-muted"
            : isTeam
              ? "border-brand/20 bg-brand text-white"
              : "border-border-ui bg-surface text-ink"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <p className={`text-xs font-semibold ${isTeam ? "text-white/80" : "text-ink-muted"}`}>
            {isSystem ? "System" : isTeam ? "GSA team" : message.authorName || "Customer"}
          </p>
          <p className={`text-[11px] ${isTeam ? "text-white/70" : "text-ink-muted"}`}>{formatDateTime(message.createdAt)}</p>
        </div>
        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{message.body}</p>
      </div>
    </div>
  );
}

function ConversationQuoteRow({
  quote,
  booking,
  room,
  saving,
  counterDraft,
  onCreateRoom,
  onInvite,
  onSendOffer,
  onBook,
  onStartCounter,
  onCounterDraftChange,
  onSubmitCounter,
  onCancelCounter,
  onDecline,
}: {
  quote: MandateQuote;
  booking?: MandateBooking;
  room?: QuoteRoom;
  saving: boolean;
  counterDraft?: CounterDraft;
  onCreateRoom: () => void;
  onInvite: () => void;
  onSendOffer: (room: QuoteRoom) => void;
  onBook: () => void;
  onStartCounter: () => void;
  onCounterDraftChange: (patch: Partial<CounterDraft>) => void;
  onSubmitCounter: () => void;
  onCancelCounter: () => void;
  onDecline: () => void;
}) {
  const config = statusConfig[quote.status];
  const belowFloor = quote.floorRatePerKg ? quote.requestedRatePerKg < quote.floorRatePerKg : false;
  const canBook = quote.status === "auto-approved" || quote.status === "airline-approved";
  const latestCustomerMessage = room?.messages.filter((message) => message.actor === "customer").sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt))[0];

  return (
    <div className="rounded-xl border border-border-ui bg-surface2 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{quote.origin}-{quote.destination}</p>
            <Badge variant={config.variant}>{config.label}</Badge>
            {belowFloor && <Badge variant="warning">Below floor</Badge>}
            {quote.sourceChannel === "customer-email" && <Badge variant="muted">Email RFQ</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {quote.cargoType} - {quote.weightKg.toLocaleString()} kg - {quote.pieces} pcs - deadline {formatDateTime(quote.deadline)}
          </p>
        </div>
        <div className="rounded-lg border border-border-ui bg-surface px-3 py-2 text-right">
          <p className="text-lg font-bold text-ink">EUR {quote.requestedRatePerKg.toFixed(2)}/kg</p>
          <p className="text-xs text-ink-muted">Floor {quote.floorRatePerKg ? `EUR ${quote.floorRatePerKg.toFixed(2)}` : "not set"}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-ink-muted md:grid-cols-3">
        <Info label="Flight date" value={quote.flightDate} />
        <Info label="Product" value={quote.product || quote.cargoType} />
        <Info label="Booking" value={booking ? `${booking.awbNumber} / ${booking.status}` : "Not booked"} />
      </div>

      {(quote.temperatureRange || quote.dangerousGoods || quote.routingPreference || quote.transitRequirement) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {quote.temperatureRange && <Badge variant="success">Temp {quote.temperatureRange}</Badge>}
          {quote.dangerousGoods && <Badge variant="warning">DG {quote.unNumber ?? ""}</Badge>}
          {quote.routingPreference && <Badge variant="muted">{quote.routingPreference}</Badge>}
          {quote.transitRequirement && <Badge variant="muted">{quote.transitRequirement}</Badge>}
        </div>
      )}

      {latestCustomerMessage && (
        <div className="mt-3 rounded-lg border border-warning/25 bg-warning-bg p-3 text-sm text-warning">
          <p className="font-semibold">Customer reply</p>
          <p className="mt-1">{latestCustomerMessage.body}</p>
        </div>
      )}

      {counterDraft?.open && (
        <div className="mt-3 rounded-xl border border-brand/25 bg-brand-light p-3">
          <div className="grid gap-3 lg:grid-cols-[180px_1fr_auto] lg:items-end">
            <Field label="Counter rate EUR/kg">
              <Input
                type="number"
                step="0.01"
                value={counterDraft.rate}
                onChange={(event) => onCounterDraftChange({ rate: event.target.value })}
              />
            </Field>
            <Field label="Customer note">
              <Textarea
                rows={3}
                value={counterDraft.note}
                onChange={(event) => onCounterDraftChange({ note: event.target.value })}
                placeholder="Explain routing, validity, DG/temp approval, or space condition."
              />
            </Field>
            <div className="flex gap-2">
              <Button size="sm" onClick={onSubmitCounter} disabled={saving}>
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelCounter} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-ui pt-3">
        <p className="text-xs text-ink-muted">Contact: {quote.contactName || quote.customer} - {quote.contactEmail || "No email"}</p>
        <div className="flex flex-wrap justify-end gap-2">
          {room ? (
            <>
              <Button size="sm" variant="outline" onClick={onInvite} disabled={saving}>
                <Mail className="h-3.5 w-3.5" />
                Email link
              </Button>
              <Button size="sm" onClick={() => onSendOffer(room)} disabled={saving}>
                <Send className="h-3.5 w-3.5" />
                Send rate
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onCreateRoom} disabled={saving}>
              <Link2 className="h-3.5 w-3.5" />
              Create room
            </Button>
          )}
          {canBook && !booking && (
            <Button size="sm" variant="outline" onClick={onBook} disabled={saving}>
              <PackageCheck className="h-3.5 w-3.5" />
              Book
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onStartCounter} disabled={quote.status === "declined" || quote.status === "expired"}>
            Counter
          </Button>
          <Button size="sm" variant="ghost" onClick={onDecline} disabled={quote.status === "declined" || quote.status === "expired"}>
            <X className="h-3.5 w-3.5" />
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
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

function QuoteInboxLoading() {
  return (
    <>
      <div className="rounded-xl border border-border-ui bg-surface p-4">
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          Loading live quotes, bookings, and customer rooms...
        </div>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-surface2" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-16 animate-pulse rounded bg-surface2" />
                <div className="h-3 w-28 animate-pulse rounded bg-surface2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="h-5 w-48 animate-pulse rounded bg-surface2" />
          <div className="h-24 animate-pulse rounded bg-surface2" />
          <div className="h-16 animate-pulse rounded bg-surface2" />
        </CardContent>
      </Card>
    </>
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
- Destination: Copenhagen (CPH)
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
