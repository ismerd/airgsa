import { randomBytes } from "node:crypto";
import type { SessionPayload } from "@/lib/auth/session";
import { canViewContract } from "@/lib/auth/permissions";
import { createId } from "@/lib/services/ids";
import { getMandateQuote, type MandateQuote } from "@/lib/services/mandate-execution-store";
import { sendTransactionalEmail, type TransactionalEmailResult } from "@/lib/services/notification-email";
import { assertFileStoreFallbackAllowed, rowData, withPostgres, withPostgresTransaction } from "@/lib/services/postgres-store";
import { listLivePartnerContracts } from "@/lib/services/tender-workflow-store";

export type QuoteRoomStatus = "open" | "accepted" | "rejected" | "closed";
export type QuoteRoomActor = "gsa" | "customer" | "system";
export type QuoteOfferStatus = "sent" | "accepted" | "rejected" | "withdrawn";

export type QuoteRoomMessage = {
  id: string;
  roomId: string;
  actor: QuoteRoomActor;
  authorName: string;
  body: string;
  createdAt: string;
};

export type QuoteRoomOffer = {
  id: string;
  roomId: string;
  quoteId: string;
  status: QuoteOfferStatus;
  currency: "EUR";
  ratePerKg: number;
  allInCharges?: string;
  routing: string;
  transitTime?: string;
  validUntil: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decisionNote?: string;
};

export type QuoteRoom = {
  id: string;
  publicToken: string;
  quoteId: string;
  contractId: string;
  tenderId: string;
  airlineCompanyId?: string;
  gsaCompanyId?: string;
  airline: string;
  gsaName: string;
  customer: string;
  contactName: string;
  contactEmail: string;
  title: string;
  routeLabel: string;
  status: QuoteRoomStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  quoteSnapshot: Pick<
    MandateQuote,
    | "origin"
    | "destination"
    | "cargoType"
    | "weightKg"
    | "pieces"
    | "product"
    | "dimensions"
    | "readyDate"
    | "routingPreference"
    | "transitRequirement"
    | "dangerousGoods"
    | "unNumber"
    | "dgClass"
    | "packingInstruction"
    | "temperatureRange"
    | "handlingNotes"
    | "requestedConfirmations"
    | "priority"
  >;
  messages: QuoteRoomMessage[];
  offers: QuoteRoomOffer[];
};

export type QuoteRoomCreateOptions = {
  sendInvite?: boolean;
  createInitialOffer?: boolean;
  origin?: string;
};

export type RateOfferInput = {
  ratePerKg: number;
  allInCharges?: string;
  routing?: string;
  transitTime?: string;
  validUntil?: string;
  notes?: string;
};

export type CustomerMessageInput = {
  body: string;
  authorName?: string;
};

export type CustomerOfferDecisionInput = {
  action: "accept" | "reject";
  note?: string;
};

export async function listQuoteRoomsForSession(session: SessionPayload): Promise<QuoteRoom[]> {
  const rooms = await withPostgres(async (client) => {
    const result = await client.query(
      `select data
       from public.workflow_quote_rooms
       where $1 = 'admin'
          or airline_company_id = $2
          or gsa_company_id = $2
       order by updated_at desc`,
      [session.role, session.companyId ?? null],
    );
    return result.rows.map((row) => rowData<QuoteRoom>(row));
  });
  if (rooms) return rooms;
  assertFileStoreFallbackAllowed("Quote room store");
  return [];
}

export async function ensureQuoteRoomForQuote(
  session: SessionPayload,
  quoteId: string,
  options: QuoteRoomCreateOptions = {},
): Promise<{ room: QuoteRoom; email?: TransactionalEmailResult }> {
  if (session.role !== "gsa" && session.role !== "admin") throw new Error("GSA login required");

  const quote = await getMandateQuote(quoteId);
  if (!quote) throw new Error("Quote not found");
  await assertCanManageQuote(session, quote);

  const room = await withPostgresTransaction(async (client) => {
    const existing = await client.query("select data from public.workflow_quote_rooms where quote_id = $1 limit 1", [quoteId]);
    if (existing.rows[0]) return rowData<QuoteRoom>(existing.rows[0]);

    const now = new Date().toISOString();
    const created: QuoteRoom = {
      id: createId("qroom"),
      publicToken: createPublicToken(),
      quoteId: quote.id,
      contractId: quote.contractId,
      tenderId: quote.tenderId,
      airlineCompanyId: quote.airlineCompanyId,
      gsaCompanyId: quote.gsaCompanyId,
      airline: quote.airline,
      gsaName: quote.gsaName,
      customer: quote.customer,
      contactName: quote.contactName,
      contactEmail: quote.contactEmail,
      title: `${quote.origin}-${quote.destination} rate request`,
      routeLabel: `${quote.origin}-${quote.destination}`,
      status: "open",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      quoteSnapshot: quoteSnapshotFromQuote(quote),
      messages: [
        {
          id: createId("qmsg"),
          roomId: "",
          actor: "system",
          authorName: "AirGSA",
          body: "Customer quote room created. Share this link with the forwarder to keep the negotiation in one place.",
          createdAt: now,
        },
      ],
      offers: [],
    };
    created.messages[0].roomId = created.id;

    await insertRoom(client, created);
    await insertMessage(client, created.messages[0]);
    return created;
  });

  if (!room) {
    assertFileStoreFallbackAllowed("Quote room store");
    throw new Error("Quote room store is not configured");
  }

  let nextRoom = room;
  if (options.createInitialOffer && nextRoom.offers.length === 0) {
    nextRoom = await createQuoteRoomOffer(session, nextRoom.id, defaultOfferFromQuote(quote));
  }

  const email = options.sendInvite ? await sendQuoteRoomInvite(nextRoom, options.origin) : undefined;
  return { room: nextRoom, email };
}

export async function createQuoteRoomOffer(session: SessionPayload, roomId: string, input: RateOfferInput): Promise<QuoteRoom> {
  if (session.role !== "gsa" && session.role !== "admin") throw new Error("GSA login required");
  const room = await getQuoteRoomById(roomId);
  if (!room) throw new Error("Quote room not found");
  const quote = await getMandateQuote(room.quoteId);
  if (!quote) throw new Error("Quote not found");
  await assertCanManageQuote(session, quote);

  const offer = buildOffer(room, quote, input);
  return mutateRoom(room.id, (current) => {
    const offers = current.offers.map((item) => item.status === "sent" ? { ...item, status: "withdrawn" as const, updatedAt: offer.createdAt } : item);
    offers.unshift(offer);
    return {
      ...current,
      status: "open",
      offers,
      messages: [
        {
          id: createId("qmsg"),
          roomId: current.id,
          actor: "gsa",
          authorName: session.name || current.gsaName,
          body: `Rate offer sent: EUR ${offer.ratePerKg.toFixed(2)}/kg for ${offer.routing}.`,
          createdAt: offer.createdAt,
        },
        ...current.messages,
      ],
      updatedAt: offer.createdAt,
      lastMessageAt: offer.createdAt,
    };
  });
}

export async function getPublicQuoteRoom(publicToken: string): Promise<QuoteRoom | null> {
  const room = await withPostgres(async (client) => {
    const result = await client.query("select data from public.workflow_quote_rooms where public_token = $1 limit 1", [publicToken]);
    return result.rows[0] ? rowData<QuoteRoom>(result.rows[0]) : null;
  });
  if (room) return hydrateRoomQuoteSnapshot(room);
  if (room === null) return null;
  assertFileStoreFallbackAllowed("Quote room store");
  return null;
}

export async function addCustomerQuoteRoomMessage(publicToken: string, input: CustomerMessageInput): Promise<QuoteRoom | null> {
  const room = await getPublicQuoteRoom(publicToken);
  if (!room) return null;
  const body = input.body.trim();
  if (!body) throw new Error("Message is required");
  if (body.length > 2000) throw new Error("Message is too long");

  const now = new Date().toISOString();
  return mutateRoom(room.id, (current) => ({
    ...current,
    messages: [
      {
        id: createId("qmsg"),
        roomId: current.id,
        actor: "customer",
        authorName: input.authorName?.trim() || current.contactName || current.customer,
        body,
        createdAt: now,
      },
      ...current.messages,
    ],
    updatedAt: now,
    lastMessageAt: now,
  }));
}

export async function addGsaQuoteRoomMessage(session: SessionPayload, roomId: string, input: CustomerMessageInput): Promise<QuoteRoom> {
  if (session.role !== "gsa" && session.role !== "admin") throw new Error("GSA login required");
  const room = await getQuoteRoomById(roomId);
  if (!room) throw new Error("Quote room not found");
  const quote = await getMandateQuote(room.quoteId);
  if (!quote) throw new Error("Quote not found");
  await assertCanManageQuote(session, quote);

  const body = input.body.trim();
  if (!body) throw new Error("Message is required");
  if (body.length > 2000) throw new Error("Message is too long");

  const now = new Date().toISOString();
  return mutateRoom(room.id, (current) => ({
    ...current,
    status: "open",
    messages: [
      {
        id: createId("qmsg"),
        roomId: current.id,
        actor: "gsa",
        authorName: input.authorName?.trim() || session.name || current.gsaName,
        body,
        createdAt: now,
      },
      ...current.messages,
    ],
    updatedAt: now,
    lastMessageAt: now,
  }));
}

export async function decideQuoteRoomOffer(
  publicToken: string,
  offerId: string,
  input: CustomerOfferDecisionInput,
): Promise<QuoteRoom | null> {
  const room = await getPublicQuoteRoom(publicToken);
  if (!room) return null;
  const offer = room.offers.find((item) => item.id === offerId);
  if (!offer) throw new Error("Offer not found");
  if (offer.status !== "sent") throw new Error("This offer is no longer open");

  const now = new Date().toISOString();
  const accepted = input.action === "accept";
  return mutateRoom(room.id, (current) => ({
    ...current,
    status: accepted ? "accepted" : "rejected",
    offers: current.offers.map((item) =>
      item.id === offerId
        ? {
            ...item,
            status: accepted ? "accepted" : "rejected",
            updatedAt: now,
            decidedAt: now,
            decisionNote: input.note?.trim() || undefined,
          }
        : item,
    ),
    messages: [
      {
        id: createId("qmsg"),
        roomId: current.id,
        actor: "customer",
        authorName: current.contactName || current.customer,
        body: accepted ? "Offer accepted." : `Offer rejected.${input.note?.trim() ? ` ${input.note.trim()}` : ""}`,
        createdAt: now,
      },
      ...current.messages,
    ],
    updatedAt: now,
    lastMessageAt: now,
  }));
}

export function getQuoteRoomPublicUrl(room: Pick<QuoteRoom, "publicToken">, origin?: string) {
  const base = origin || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  return new URL(`/quote-room/${room.publicToken}`, base).toString();
}

async function sendQuoteRoomInvite(room: QuoteRoom, origin?: string) {
  if (!room.contactEmail) {
    return { provider: "disabled" as const, status: "skipped" as const, error: "Quote has no customer email" };
  }
  const href = getQuoteRoomPublicUrl(room, origin);
  return sendTransactionalEmail({
    to: room.contactEmail,
    subject: `${room.gsaName}: rate request ${room.routeLabel}`,
    text: [
      `Hello ${room.contactName || room.customer},`,
      "",
      `${room.gsaName} opened a secure quote room for your ${room.routeLabel} request.`,
      `Use this link to review the rate offer, ask questions, accept, or reject:`,
      href,
      "",
      "Best regards,",
      room.gsaName,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px">${escapeHtml(room.gsaName)} quote room</h2>
        <p>Hello ${escapeHtml(room.contactName || room.customer)},</p>
        <p>${escapeHtml(room.gsaName)} opened a secure quote room for your <strong>${escapeHtml(room.routeLabel)}</strong> request.</p>
        <p><a href="${escapeHtml(href)}">Open quote room</a></p>
      </div>
    `,
  });
}

async function assertCanManageQuote(session: SessionPayload, quote: MandateQuote) {
  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === quote.contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Quote not found");
  if (session.role === "gsa" && quote.gsaCompanyId && quote.gsaCompanyId !== session.companyId) {
    throw new Error("Quote not found");
  }
}

async function getQuoteRoomById(roomId: string) {
  const room = await withPostgres(async (client) => {
    const result = await client.query("select data from public.workflow_quote_rooms where id = $1 limit 1", [roomId]);
    return result.rows[0] ? rowData<QuoteRoom>(result.rows[0]) : null;
  });
  if (room !== null) return room;
  assertFileStoreFallbackAllowed("Quote room store");
  return null;
}

async function mutateRoom(roomId: string, mutate: (room: QuoteRoom) => QuoteRoom): Promise<QuoteRoom> {
  const updated = await withPostgresTransaction(async (client) => {
    const currentResult = await client.query("select data from public.workflow_quote_rooms where id = $1 for update", [roomId]);
    if (!currentResult.rows[0]) throw new Error("Quote room not found");
    const next = mutate(rowData<QuoteRoom>(currentResult.rows[0]));
    await client.query("delete from public.workflow_quote_room_messages where room_id = $1", [roomId]);
    await client.query("delete from public.workflow_quote_room_offers where room_id = $1", [roomId]);
    await updateRoom(client, next);
    for (const offer of next.offers) await insertOffer(client, offer);
    for (const message of next.messages) await insertMessage(client, message);
    return next;
  });
  if (updated) return updated;
  assertFileStoreFallbackAllowed("Quote room store");
  throw new Error("Quote room store is not configured");
}

function buildOffer(room: QuoteRoom, quote: MandateQuote, input: RateOfferInput): QuoteRoomOffer {
  const now = new Date().toISOString();
  const rate = Number(input.ratePerKg);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Rate must be greater than zero");
  return {
    id: createId("qoffer"),
    roomId: room.id,
    quoteId: quote.id,
    status: "sent",
    currency: "EUR",
    ratePerKg: rate,
    allInCharges: cleanOptional(input.allInCharges),
    routing: cleanOptional(input.routing) ?? `${quote.origin}-${quote.destination}`,
    transitTime: cleanOptional(input.transitTime),
    validUntil: input.validUntil || defaultOfferValidity(),
    notes: cleanOptional(input.notes),
    createdAt: now,
    updatedAt: now,
  };
}

async function hydrateRoomQuoteSnapshot(room: QuoteRoom) {
  try {
    const quote = await getMandateQuote(room.quoteId);
    if (!quote) return room;
    return {
      ...room,
      quoteSnapshot: {
        ...room.quoteSnapshot,
        ...quoteSnapshotFromQuote(quote),
      },
    };
  } catch {
    return room;
  }
}

function quoteSnapshotFromQuote(quote: MandateQuote): QuoteRoom["quoteSnapshot"] {
  return {
    origin: quote.origin,
    destination: quote.destination,
    cargoType: quote.cargoType,
    weightKg: quote.weightKg,
    pieces: quote.pieces,
    product: quote.product,
    dimensions: quote.dimensions,
    readyDate: quote.readyDate,
    routingPreference: quote.routingPreference,
    transitRequirement: quote.transitRequirement,
    dangerousGoods: quote.dangerousGoods,
    unNumber: quote.unNumber,
    dgClass: quote.dgClass,
    packingInstruction: quote.packingInstruction,
    temperatureRange: quote.temperatureRange,
    handlingNotes: quote.handlingNotes,
    requestedConfirmations: quote.requestedConfirmations,
    priority: quote.priority,
  };
}

function defaultOfferFromQuote(quote: MandateQuote): RateOfferInput {
  return {
    ratePerKg: quote.counterRatePerKg ?? quote.requestedRatePerKg,
    routing: quote.routingPreference || `${quote.origin}-${quote.destination}`,
    transitTime: quote.transitRequirement || "Fastest available confirmed option",
    validUntil: defaultOfferValidity(),
    notes: buildOfferNotes(quote),
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

function defaultOfferValidity() {
  const date = new Date();
  date.setHours(date.getHours() + 24, 0, 0, 0);
  return date.toISOString();
}

function createPublicToken() {
  return randomBytes(24).toString("base64url");
}

function cleanOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

async function insertRoom(client: { query: (query: string, values?: unknown[]) => Promise<unknown> }, room: QuoteRoom) {
  await client.query(
    `insert into public.workflow_quote_rooms
      (id, public_token, quote_id, contract_id, airline_company_id, gsa_company_id, customer_email, status, created_at, updated_at, last_message_at, data)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
    [
      room.id,
      room.publicToken,
      room.quoteId,
      room.contractId,
      room.airlineCompanyId ?? null,
      room.gsaCompanyId ?? null,
      room.contactEmail || null,
      room.status,
      room.createdAt,
      room.updatedAt,
      room.lastMessageAt,
      JSON.stringify(room),
    ],
  );
}

async function updateRoom(client: { query: (query: string, values?: unknown[]) => Promise<unknown> }, room: QuoteRoom) {
  await client.query(
    `update public.workflow_quote_rooms set
      status = $2,
      updated_at = $3,
      last_message_at = $4,
      data = $5::jsonb
     where id = $1`,
    [room.id, room.status, room.updatedAt, room.lastMessageAt, JSON.stringify(room)],
  );
}

async function insertMessage(client: { query: (query: string, values?: unknown[]) => Promise<unknown> }, message: QuoteRoomMessage) {
  await client.query(
    `insert into public.workflow_quote_room_messages
      (id, room_id, actor, created_at, data)
     values ($1, $2, $3, $4, $5::jsonb)
     on conflict (id) do update set data = excluded.data`,
    [message.id, message.roomId, message.actor, message.createdAt, JSON.stringify(message)],
  );
}

async function insertOffer(client: { query: (query: string, values?: unknown[]) => Promise<unknown> }, offer: QuoteRoomOffer) {
  await client.query(
    `insert into public.workflow_quote_room_offers
      (id, room_id, quote_id, status, created_at, updated_at, data)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb)
     on conflict (id) do update set status = excluded.status, updated_at = excluded.updated_at, data = excluded.data`,
    [offer.id, offer.roomId, offer.quoteId, offer.status, offer.createdAt, offer.updatedAt, JSON.stringify(offer)],
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
