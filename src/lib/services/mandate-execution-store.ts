import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { canViewContract } from "@/lib/auth/permissions";
import { rowData, withPostgres } from "@/lib/services/postgres-store";
import { listLivePartnerContracts, type LivePartnerContract } from "@/lib/services/tender-workflow-store";

const STORE_PATH = path.join(process.cwd(), "data", "mandate-execution.json");
const STORE_KEY = "mandate_execution_store";

export type MandateQuoteStatus =
  | "draft"
  | "auto-approved"
  | "airline-approval-required"
  | "airline-approved"
  | "airline-rejected"
  | "countered"
  | "declined";

export type MandateQuote = {
  id: string;
  contractId: string;
  tenderId: string;
  airlineCompanyId?: string;
  airlineEmail: string;
  airline: string;
  gsaCompanyId?: string;
  gsaId: string;
  gsaName: string;
  routeId?: string;
  origin: string;
  destination: string;
  customer: string;
  contactName: string;
  contactEmail: string;
  cargoType: string;
  weightKg: number;
  pieces: number;
  requestedRatePerKg: number;
  floorRatePerKg?: number;
  flightDate: string;
  deadline: string;
  status: MandateQuoteStatus;
  decisionReason?: string;
  counterRatePerKg?: number;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decidedBy?: string;
};

export type QuoteCreateInput = Pick<
  MandateQuote,
  | "contractId"
  | "routeId"
  | "origin"
  | "destination"
  | "customer"
  | "contactName"
  | "contactEmail"
  | "cargoType"
  | "weightKg"
  | "pieces"
  | "requestedRatePerKg"
  | "flightDate"
  | "deadline"
>;

export type QuoteActionInput = {
  action: "approve" | "reject" | "counter" | "decline";
  reason?: string;
  counterRatePerKg?: number;
};

export type MandateAuditEvent = {
  id: string;
  actorEmail: string;
  actorName: string;
  actorRole: SessionPayload["role"];
  company: string;
  entityType: "contract" | "quote" | "route";
  entityId: string;
  action: string;
  summary: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

type MandateExecutionStore = {
  quotes: MandateQuote[];
  auditEvents: MandateAuditEvent[];
};

export async function listMandateQuotes(session: SessionPayload) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  const visibleContractIds = new Set(contracts.filter((contract) => canViewContract(session, contract)).map((contract) => contract.id));
  return store.quotes
    .filter((quote) => visibleContractIds.has(quote.contractId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getMandateQuote(id: string) {
  const store = await readStore();
  return store.quotes.find((quote) => quote.id === id) ?? null;
}

export async function createMandateQuote(session: SessionPayload, input: QuoteCreateInput) {
  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === input.contractId);
  if (!contract || !canViewContract(session, contract) || session.role !== "gsa") {
    throw new Error("Contract not found");
  }

  const floorRate = contract.controlRules?.rateFloorPerKg;
  const status = getInitialQuoteStatus(input.requestedRatePerKg, floorRate, contract);
  const now = new Date().toISOString();
  const quote: MandateQuote = {
    ...input,
    id: `quo-${Date.now().toString(36)}`,
    tenderId: contract.tenderId,
    airlineCompanyId: contract.airlineCompanyId,
    airlineEmail: contract.airlineEmail,
    airline: contract.airline,
    gsaCompanyId: contract.gsaCompanyId,
    gsaId: contract.gsaId,
    gsaName: contract.gsaName,
    floorRatePerKg: floorRate,
    status,
    decisionReason: status === "airline-approval-required" ? "Requested rate is below airline floor." : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const store = await readStore();
  store.quotes.unshift(quote);
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "quote",
    entityId: quote.id,
    action: "quote.created",
    summary: `${quote.gsaName} created quote ${quote.origin}-${quote.destination} for ${quote.customer}`,
    metadata: { contractId: quote.contractId, requestedRatePerKg: quote.requestedRatePerKg, status: quote.status },
  }));
  if (status === "airline-approval-required") {
    store.auditEvents.unshift(buildAuditEvent(session, {
      entityType: "quote",
      entityId: quote.id,
      action: "quote.approval_required",
      summary: `Quote ${quote.id} needs airline approval because rate is below floor`,
      metadata: { floorRatePerKg: floorRate, requestedRatePerKg: quote.requestedRatePerKg },
    }));
  }
  await writeStore(store);
  return quote;
}

export async function updateMandateQuoteStatus(session: SessionPayload, quoteId: string, input: QuoteActionInput) {
  const store = await readStore();
  const index = store.quotes.findIndex((quote) => quote.id === quoteId);
  if (index < 0) return null;

  const contracts = await listLivePartnerContracts();
  const contract = contracts.find((item) => item.id === store.quotes[index].contractId);
  if (!contract || !canViewContract(session, contract)) throw new Error("Quote not found");

  const now = new Date().toISOString();
  const quote = store.quotes[index];
  const nextStatus = getNextQuoteStatus(session, input.action);
  const nextQuote: MandateQuote = {
    ...quote,
    status: nextStatus,
    decisionReason: input.reason ?? quote.decisionReason,
    counterRatePerKg: input.action === "counter" ? input.counterRatePerKg : quote.counterRatePerKg,
    updatedAt: now,
    decidedAt: now,
    decidedBy: session.email,
  };

  store.quotes[index] = nextQuote;
  store.auditEvents.unshift(buildAuditEvent(session, {
    entityType: "quote",
    entityId: quote.id,
    action: `quote.${input.action}`,
    summary: `${session.company} ${input.action}ed quote ${quote.id}`,
    metadata: {
      contractId: quote.contractId,
      requestedRatePerKg: quote.requestedRatePerKg,
      floorRatePerKg: quote.floorRatePerKg,
      counterRatePerKg: input.counterRatePerKg,
    },
  }));
  await writeStore(store);
  return nextQuote;
}

export async function listMandateAuditEvents(session: SessionPayload) {
  const [store, contracts] = await Promise.all([readStore(), listLivePartnerContracts()]);
  if (session.role === "admin") return store.auditEvents;

  const visibleContractIds = new Set(contracts.filter((contract) => canViewContract(session, contract)).map((contract) => contract.id));
  const quoteIds = new Set(store.quotes.filter((quote) => visibleContractIds.has(quote.contractId)).map((quote) => quote.id));

  return store.auditEvents.filter((event) => {
    if (event.entityType === "quote") return quoteIds.has(event.entityId);
    if (event.entityType === "contract" || event.entityType === "route") return visibleContractIds.has(event.entityId);
    return false;
  });
}

export async function appendMandateAuditEvent(session: SessionPayload, event: Omit<MandateAuditEvent, "id" | "actorEmail" | "actorName" | "actorRole" | "company" | "createdAt">) {
  const store = await readStore();
  const auditEvent = buildAuditEvent(session, event);
  store.auditEvents.unshift(auditEvent);
  await writeStore(store);
  return auditEvent;
}

function getInitialQuoteStatus(rate: number, floor: number | undefined, contract: LivePartnerContract): MandateQuoteStatus {
  if (!floor) return "auto-approved";
  const variance = contract.controlRules?.autoApprovalVariancePct ?? 0;
  const allowedFloor = floor * (1 - variance / 100);
  if (rate >= allowedFloor) return "auto-approved";
  return contract.controlRules?.requireAirlineApprovalBelowFloor === false ? "draft" : "airline-approval-required";
}

function getNextQuoteStatus(session: SessionPayload, action: QuoteActionInput["action"]): MandateQuoteStatus {
  if (action === "approve") {
    if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline approval required");
    return "airline-approved";
  }
  if (action === "reject") {
    if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline approval required");
    return "airline-rejected";
  }
  if (action === "counter") return "countered";
  return "declined";
}

function buildAuditEvent(
  session: SessionPayload,
  event: Omit<MandateAuditEvent, "id" | "actorEmail" | "actorName" | "actorRole" | "company" | "createdAt">,
): MandateAuditEvent {
  return {
    ...event,
    id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    actorEmail: session.email,
    actorName: session.name,
    actorRole: session.role,
    company: session.company,
    createdAt: new Date().toISOString(),
  };
}

async function readStore(): Promise<MandateExecutionStore> {
  const dbStore = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [STORE_KEY]);
    if (result.rows.length === 0) return null;
    return normalizeStore(rowData<Partial<MandateExecutionStore>>(result.rows[0]));
  });
  if (dbStore) return dbStore;

  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return normalizeStore(JSON.parse(raw) as Partial<MandateExecutionStore>);
  } catch {
    return { quotes: [], auditEvents: [] };
  }
}

async function writeStore(store: MandateExecutionStore) {
  const saved = await withPostgres(async (client) => {
    await client.query(
      `
        insert into app_settings (key, value, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `,
      [STORE_KEY, JSON.stringify(store)],
    );
    return true;
  });
  if (saved) return;

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function normalizeStore(store: Partial<MandateExecutionStore>): MandateExecutionStore {
  return {
    quotes: store.quotes ?? [],
    auditEvents: store.auditEvents ?? [],
  };
}
