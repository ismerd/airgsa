"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Send, ShieldCheck, Snowflake, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuoteRoom, QuoteRoomOffer } from "@/lib/services/quote-room-store";

export function QuoteRoomClient({ token }: { token: string }) {
  const [room, setRoom] = useState<QuoteRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const refreshInFlightRef = useRef(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  const latestOffer = useMemo(
    () => room?.offers.find((offer) => offer.status === "sent") ?? room?.offers[0] ?? null,
    [room],
  );
  const quickReplies = useMemo(() => buildQuickReplies(room, latestOffer), [room, latestOffer]);
  const conversationMessages = useMemo(
    () => [...(room?.messages ?? [])].sort((left, right) => safeTime(left.createdAt) - safeTime(right.createdAt)),
    [room],
  );

  const refresh = useCallback(async (options: { initial?: boolean; silent?: boolean } = {}) => {
    if (refreshInFlightRef.current && options.silent) return;
    refreshInFlightRef.current = true;
    if (options.initial) setLoading(true);
    if (!options.silent) setError(null);
    try {
      const res = await fetch(`/api/quote-room/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote room could not be loaded");
      setRoom(data.room);
      if (data.room?.contactName) setName((current) => current || data.room.contactName);
    } catch (err) {
      if (!options.silent) setError((err as Error).message);
    } finally {
      refreshInFlightRef.current = false;
      if (options.initial) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh({ initial: true });
  }, [refresh]);

  useEffect(() => {
    function refreshIfVisible() {
      if (document.visibilityState === "visible") void refresh({ silent: true });
    }

    const interval = window.setInterval(refreshIfVisible, 15000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const node = conversationRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [room?.lastMessageAt, conversationMessages.length]);

  async function sendMessage() {
    if (!message.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/quote-room/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message, authorName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Message could not be sent");
      setRoom(data.room);
      setMessage("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function decideOffer(offer: QuoteRoomOffer, action: "accept" | "reject") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/quote-room/${token}/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: decisionNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Offer could not be updated");
      setRoom(data.room);
      setDecisionNote("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-page p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border-ui bg-surface p-8 shadow-sm">
          <div className="flex items-center justify-center gap-3 text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            Loading secure quote room...
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="h-20 animate-pulse rounded-xl bg-surface2" />
            <div className="h-20 animate-pulse rounded-xl bg-surface2" />
            <div className="h-20 animate-pulse rounded-xl bg-surface2" />
          </div>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-page p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-danger/25 bg-danger-bg p-8 text-center text-danger shadow-sm">
          {error ?? "Quote room not found"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-page">
      <section className="border-b border-border-ui bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand">Secure Quote Room</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">{room.gsaName}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {room.title} for {room.customer}
            </p>
          </div>
          <Badge variant={room.status === "accepted" ? "success" : room.status === "rejected" ? "danger" : "default"}>
            {room.status === "open" ? "Open negotiation" : room.status}
          </Badge>
        </div>
      </section>

      <div className="mx-auto max-w-6xl p-5">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 border-b border-border-ui pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">Conversation</p>
                  <Badge variant={room.status === "accepted" ? "success" : room.status === "rejected" ? "danger" : "default"}>
                    {room.status === "open" ? "Open negotiation" : room.status}
                  </Badge>
                </div>
                <h2 className="mt-2 text-2xl font-bold text-ink">{room.customer}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {[room.contactName, room.contactEmail].filter(Boolean).join(" - ") || "No contact details saved yet"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniMetric label="Quote" value={room.routeLabel} />
                <MiniMetric label="Messages" value={String(conversationMessages.length)} />
                <MiniMetric label="Latest" value={formatDateTime(room.lastMessageAt)} />
              </div>
            </div>

            {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

            <CustomerQuoteContext
              room={room}
              offer={latestOffer}
              saving={saving}
              decisionNote={decisionNote}
              setDecisionNote={setDecisionNote}
              onAccept={() => latestOffer && decideOffer(latestOffer, "accept")}
              onReject={() => latestOffer && decideOffer(latestOffer, "reject")}
            />

            <div className="overflow-hidden rounded-2xl border border-brand/20 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-brand/10 bg-[#F5F8FF] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">Chat with GSA team</p>
                    {saving && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-1 text-xs font-semibold text-brand">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">Reply here as the customer. The GSA team sees the same thread in its quote inbox.</p>
                </div>
              </div>

              <div className="space-y-4 bg-white p-4">
                <div ref={conversationRef} className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-border-ui bg-[#F3F6FD] p-3">
                  {conversationMessages.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border-ui bg-surface p-4 text-center text-sm text-ink-muted">
                      No messages yet. Send the first question or negotiation note below.
                    </p>
                  ) : (
                    conversationMessages.map((item) => <ThreadMessageBubble key={item.id} message={item} />)
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <Button key={reply.label} size="sm" variant="ghost" onClick={() => setMessage(reply.message)} disabled={saving}>
                      {reply.label}
                    </Button>
                  ))}
                </div>
                <div className="rounded-xl border-2 border-brand/20 bg-[#F8FAFF] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Customer reply</p>
                  <div className="grid gap-2 lg:grid-cols-[220px_1fr_auto] lg:items-end">
                    <Input className="bg-white" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
                    <Textarea
                      rows={3}
                      className="bg-white"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Write a reply or negotiation note..."
                    />
                    <Button onClick={sendMessage} disabled={saving || !message.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {saving ? "Sending..." : "Send reply"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <p className="rounded-xl border border-border-ui bg-surface2 p-3 text-sm text-ink-muted">
              This room only contains your shipment conversation with {room.gsaName}. No airline or GSA internal data is visible here.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function buildQuickReplies(room: QuoteRoom | null, offer: QuoteRoomOffer | null) {
  const replies = [
    {
      label: "Ask for lower rate",
      helper: "Start a price negotiation.",
      message: offer
        ? `Thanks for the offer. Please check if you can improve the rate below EUR ${offer.ratePerKg.toFixed(2)}/kg.`
        : "Please send your best available rate for this shipment.",
    },
    {
      label: "Confirm space",
      helper: "Ask for firm allocation.",
      message: "Please confirm firm space, routing, flight date, and latest acceptance time before we proceed.",
    },
    {
      label: "Accept subject to approval",
      helper: "Useful before final booking.",
      message: "This looks workable. Please hold the space while we collect final customer approval.",
    },
  ];

  if (room?.quoteSnapshot.temperatureRange) {
    replies.unshift({
      label: "Confirm temperature handling",
      helper: `Temperature requirement: ${room.quoteSnapshot.temperatureRange}.`,
      message: `Please confirm temperature handling for ${room.quoteSnapshot.temperatureRange}, including active/passive handling and any required packaging conditions.`,
    });
  }

  if (room?.quoteSnapshot.dangerousGoods) {
    replies.unshift({
      label: "Confirm DG acceptance",
      helper: "Use this before booking dangerous goods.",
      message: `Please confirm DG acceptance${room.quoteSnapshot.unNumber ? ` for ${room.quoteSnapshot.unNumber}` : ""}${room.quoteSnapshot.packingInstruction ? `, ${room.quoteSnapshot.packingInstruction}` : ""}. We can provide DGD/MSDS if required.`,
    });
  }

  return replies;
}

function CustomerQuoteContext({
  room,
  offer,
  saving,
  decisionNote,
  setDecisionNote,
  onAccept,
  onReject,
}: {
  room: QuoteRoom;
  offer: QuoteRoomOffer | null;
  saving: boolean;
  decisionNote: string;
  setDecisionNote: (value: string) => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const quote = room.quoteSnapshot;
  const offerIsActionable = offer?.status === "sent";

  return (
    <div className="space-y-3 rounded-2xl border border-border-ui bg-surface2 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">Quote context</p>
          <p className="text-sm text-ink-muted">Customer-facing quote overview for this conversation.</p>
        </div>
        <Badge variant="muted">1 quote</Badge>
      </div>

      <div className="rounded-xl border border-border-ui bg-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-ink">{quote.origin}-{quote.destination}</p>
              <Badge variant={offer?.status === "accepted" ? "success" : offer?.status === "rejected" ? "danger" : offer ? "warning" : "muted"}>
                {offer ? formatOfferStatus(offer.status) : "Waiting for offer"}
              </Badge>
              {room.status === "accepted" && <Badge variant="success">Accepted</Badge>}
              {room.status === "rejected" && <Badge variant="danger">Rejected</Badge>}
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {quote.cargoType} - {quote.weightKg.toLocaleString()} kg - {quote.pieces} pcs
            </p>
          </div>
          <div className="rounded-lg border border-border-ui bg-white px-3 py-2 text-right">
            <p className="text-lg font-bold text-ink">{offer ? `EUR ${offer.ratePerKg.toFixed(2)}/kg` : "Rate pending"}</p>
            <p className="text-xs text-ink-muted">{offer?.allInCharges || "GSA rate offer"}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-xs text-ink-muted md:grid-cols-3">
          <QuoteFact label="Ready date" value={quote.readyDate || "To be confirmed"} />
          <QuoteFact label="Product" value={quote.product || quote.cargoType} />
          <QuoteFact label="Offer status" value={offer ? formatOfferStatus(offer.status) : "Not sent yet"} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {quote.temperatureRange && (
            <Badge variant="success">
              <Snowflake className="mr-1 h-3 w-3" />
              Temp {quote.temperatureRange}
            </Badge>
          )}
          {quote.dangerousGoods && (
            <Badge variant="warning">
              <ShieldCheck className="mr-1 h-3 w-3" />
              DG {quote.unNumber ?? ""} {quote.dgClass ? `Class ${quote.dgClass}` : ""}
            </Badge>
          )}
          {quote.routingPreference && <Badge variant="muted">{quote.routingPreference}</Badge>}
          {quote.transitRequirement && <Badge variant="muted">{quote.transitRequirement}</Badge>}
          {quote.priority && <Badge variant={quote.priority === "urgent" ? "danger" : quote.priority === "priority" ? "warning" : "muted"}>{quote.priority}</Badge>}
        </div>

        {offer && (
          <div className="mt-3 grid gap-2 text-xs text-ink-muted md:grid-cols-3">
            <QuoteFact label="Routing" value={offer.routing || quote.routingPreference || "To be confirmed"} />
            <QuoteFact label="Transit" value={offer.transitTime || quote.transitRequirement || "To be confirmed"} />
            <QuoteFact label="Valid until" value={formatDateTime(offer.validUntil)} />
          </div>
        )}

        {offer?.notes && (
          <div className="mt-3 rounded-lg border border-brand/20 bg-brand-light p-3 text-sm text-ink">
            <p className="font-semibold">Offer note</p>
            <p className="mt-1 text-ink-muted">{offer.notes}</p>
          </div>
        )}

        {offerIsActionable && (
          <div className="mt-4 space-y-3 border-t border-border-ui pt-3">
            <Input
              className="bg-white"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder="Optional note before accepting or rejecting"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onReject} disabled={saving}>
                <XCircle className="h-4 w-4" />
                {saving ? "Saving..." : "Reject offer"}
              </Button>
              <Button onClick={onAccept} disabled={saving}>
                <CheckCircle2 className="h-4 w-4" />
                {saving ? "Saving..." : "Accept offer"}
              </Button>
            </div>
          </div>
        )}

        {offer && !offerIsActionable && (
          <div className="mt-3 rounded-lg border border-border-ui bg-surface2 p-3 text-sm text-ink-muted">
            Offer is {formatOfferStatus(offer.status).toLowerCase()}{offer.decisionNote ? `: ${offer.decisionNote}` : "."}
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadMessageBubble({ message }: { message: QuoteRoom["messages"][number] }) {
  const isTeam = message.actor === "gsa";
  const isSystem = message.actor === "system";
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[90%] rounded-full border border-border-ui bg-[#EAF0FF] px-4 py-2 text-center text-xs text-ink-muted">
          <span className="font-semibold text-ink">System update:</span> {message.body}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isTeam ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl border px-4 py-3 text-sm shadow-sm ${
          isTeam
            ? "rounded-br-md border-brand bg-brand text-white"
            : "rounded-bl-md border-[#F59E0B]/30 bg-[#FFFBEB] text-ink"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <p className={`text-xs font-semibold ${isTeam ? "text-white/80" : "text-ink-muted"}`}>
            {isTeam ? "GSA team" : message.authorName || "Customer"}
          </p>
          <p className={`text-[11px] ${isTeam ? "text-white/70" : "text-ink-muted"}`}>{formatDateTime(message.createdAt)}</p>
        </div>
        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{message.body}</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 px-3 py-2">
      <p className="truncate text-sm font-bold text-ink">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
    </div>
  );
}

function QuoteFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value || "-"}</p>
    </div>
  );
}

function formatOfferStatus(status: QuoteRoomOffer["status"]) {
  if (status === "sent") return "Offer sent";
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
  return "Withdrawn";
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

function safeTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
