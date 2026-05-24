"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Loader2, MessageSquare, Package, Send, ShieldCheck, Snowflake, XCircle } from "lucide-react";
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

  const latestOffer = useMemo(
    () => room?.offers.find((offer) => offer.status === "sent") ?? room?.offers[0] ?? null,
    [room],
  );
  const quickReplies = useMemo(() => buildQuickReplies(room, latestOffer), [room, latestOffer]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quote-room/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote room could not be loaded");
      setRoom(data.room);
      if (data.room?.contactName) setName(data.room.contactName);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

      <div className="mx-auto grid max-w-6xl gap-5 p-5 lg:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <h2 className="font-semibold text-ink">Shipment summary</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Key details extracted from the customer request and used for this rate conversation.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Fact label="Lane" value={room.routeLabel} />
                <Fact label="Cargo" value={room.quoteSnapshot.product || room.quoteSnapshot.cargoType} />
                <Fact label="Weight" value={`${room.quoteSnapshot.weightKg.toLocaleString()} kg`} />
                <Fact label="Pieces" value={String(room.quoteSnapshot.pieces)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {room.quoteSnapshot.temperatureRange && (
                  <Badge variant="success">
                    <Snowflake className="mr-1 h-3 w-3" />
                    Temp {room.quoteSnapshot.temperatureRange}
                  </Badge>
                )}
                {room.quoteSnapshot.dangerousGoods && (
                  <Badge variant="warning">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    DG {room.quoteSnapshot.unNumber ?? ""} {room.quoteSnapshot.dgClass ? `Class ${room.quoteSnapshot.dgClass}` : ""}
                  </Badge>
                )}
                {room.quoteSnapshot.priority && <Badge variant={room.quoteSnapshot.priority === "urgent" ? "danger" : room.quoteSnapshot.priority === "priority" ? "warning" : "muted"}>{room.quoteSnapshot.priority}</Badge>}
                {room.quoteSnapshot.readyDate && <Badge variant="muted">Ready {room.quoteSnapshot.readyDate}</Badge>}
                {room.quoteSnapshot.routingPreference && <Badge variant="muted">{room.quoteSnapshot.routingPreference}</Badge>}
              </div>
              {((room.quoteSnapshot.handlingNotes?.length ?? 0) > 0 || (room.quoteSnapshot.requestedConfirmations?.length ?? 0) > 0) && (
                <div className="grid gap-3 text-sm text-ink-muted md:grid-cols-2">
                  {(room.quoteSnapshot.handlingNotes?.length ?? 0) > 0 && (
                    <Fact label="Handling notes" value={room.quoteSnapshot.handlingNotes!.slice(0, 3).join(", ")} />
                  )}
                  {(room.quoteSnapshot.requestedConfirmations?.length ?? 0) > 0 && (
                    <Fact label="Customer needs" value={room.quoteSnapshot.requestedConfirmations!.slice(0, 3).join(", ")} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {latestOffer ? (
            <OfferBlock
              offer={latestOffer}
              disabled={saving || latestOffer.status !== "sent"}
              decisionNote={decisionNote}
              setDecisionNote={setDecisionNote}
              onAccept={() => decideOffer(latestOffer, "accept")}
              onReject={() => decideOffer(latestOffer, "reject")}
            />
          ) : (
            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <Clock className="mt-1 h-5 w-5 text-brand" />
                <div>
                  <p className="font-semibold text-ink">Waiting for rate offer</p>
                  <p className="mt-1 text-sm text-ink-muted">The GSA can send a structured rate block into this room.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="font-semibold text-ink">Quick replies</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Use these to answer common quote questions without writing from scratch.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply.label}
                    type="button"
                    onClick={() => setMessage(reply.message)}
                    className="rounded-lg border border-border-ui bg-surface2 p-3 text-left text-sm transition hover:border-brand/40 hover:bg-brand-light"
                  >
                    <span className="font-semibold text-ink">{reply.label}</span>
                    <span className="mt-1 block text-xs text-ink-muted">{reply.helper}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-brand" />
                <h2 className="font-semibold text-ink">Conversation</h2>
              </div>
              <div className="space-y-3">
                {room.messages.map((item) => (
                  <div
                    key={item.id}
                    className={`max-w-[88%] rounded-xl border p-3 ${
                      item.actor === "customer"
                        ? "ml-auto border-brand/20 bg-brand-light"
                        : item.actor === "gsa"
                          ? "mr-auto border-success/20 bg-success-bg"
                          : "mx-auto border-border-ui bg-surface2"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{item.authorName}</p>
                      <p className="text-xs text-ink-muted">{formatDateTime(item.createdAt)}</p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 border-t border-border-ui pt-4">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
                <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="Write a reply or negotiation note..." />
                <div className="flex justify-end">
                  <Button onClick={sendMessage} disabled={saving || !message.trim()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {saving ? "Sending..." : "Send message"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-ink">{room.customer}</p>
                <p className="text-sm text-ink-muted">{room.contactEmail}</p>
              </div>
              <p className="text-sm text-ink-muted">
                This room only contains your shipment conversation with {room.gsaName}. No airline or GSA internal data is visible here.
              </p>
            </CardContent>
          </Card>
        </aside>
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

function OfferBlock({
  offer,
  disabled,
  decisionNote,
  setDecisionNote,
  onAccept,
  onReject,
}: {
  offer: QuoteRoomOffer;
  disabled: boolean;
  decisionNote: string;
  setDecisionNote: (value: string) => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Rate offer</p>
            <p className="mt-1 text-3xl font-bold text-ink">EUR {offer.ratePerKg.toFixed(2)}/kg</p>
            {offer.allInCharges && <p className="mt-1 text-sm text-ink-muted">{offer.allInCharges}</p>}
          </div>
          <Badge variant={offer.status === "accepted" ? "success" : offer.status === "rejected" ? "danger" : "warning"}>
            {offer.status}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact label="Routing" value={offer.routing} />
          <Fact label="Transit" value={offer.transitTime || "To be confirmed"} />
          <Fact label="Valid until" value={formatDateTime(offer.validUntil)} />
        </div>
        {offer.notes && <p className="rounded-lg border border-border-ui bg-surface2 p-3 text-sm text-ink-muted">{offer.notes}</p>}
        {offer.status === "sent" && (
          <div className="space-y-3 border-t border-border-ui pt-4">
            <Input value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Optional note before accepting or rejecting" />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onReject} disabled={disabled}>
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              <Button onClick={onAccept} disabled={disabled}>
                <CheckCircle2 className="h-4 w-4" />
                Accept offer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ui bg-surface2 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value || "-"}</p>
    </div>
  );
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
