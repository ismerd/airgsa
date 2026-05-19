import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { canViewContract } from "@/lib/auth/permissions";
import { assertFileStoreFallbackAllowed, rowData, withPostgres, withPostgresTransaction } from "@/lib/services/postgres-store";
import { createId } from "@/lib/services/ids";
import { listLivePartnerContracts, type LivePartnerContract } from "@/lib/services/tender-workflow-store";

const STORE_PATH = path.join(process.cwd(), "data", "capacity-alerts.json");
const LEGACY_STORE_KEY = "capacity_alert_store";

export type CapacityAlertUrgency = "normal" | "urgent" | "critical";
export type CapacityAlertStatus = "active" | "filled" | "recalled";

export type CapacityAlertRoute = {
  key: string;
  routeId: string;
  contractId: string;
  tenderId: string;
  airline: string;
  airlineCompanyId?: string;
  gsaName: string;
  gsaCompanyId?: string;
  origin: string;
  destination: string;
  operatingDays?: string;
  weekday?: string;
  frequencyPerWeek: number;
  aircraft?: string;
};

export type CapacityAlert = {
  id: string;
  airline: string;
  airlineCompanyId?: string;
  routes: CapacityAlertRoute[];
  availableKg: number;
  totalCapacityKg: number;
  urgency: CapacityAlertUrgency;
  message: string;
  sentTo: string;
  targetGsaCompanyId?: string;
  status: CapacityAlertStatus;
  responses: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type CapacityAlertInput = {
  routeKeys: string[];
  availableKg: number;
  totalCapacityKg: number;
  urgency?: CapacityAlertUrgency;
  message: string;
  targetGsaCompanyId?: string;
};

export type CapacityAlertUpdateInput = {
  status?: CapacityAlertStatus;
};

type CapacityAlertStore = {
  alerts: CapacityAlert[];
};

const URGENCIES = new Set<CapacityAlertUrgency>(["normal", "urgent", "critical"]);
const STATUSES = new Set<CapacityAlertStatus>(["active", "filled", "recalled"]);

export async function listCapacityAlertCandidates(session: SessionPayload) {
  const contracts = await listVisibleAlertContracts(session);
  return contracts.flatMap(contractToAlertRoutes);
}

export async function listCapacityAlerts(session: SessionPayload) {
  const store = await readStore();
  return store.alerts
    .filter((alert) => canViewCapacityAlert(session, alert))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createCapacityAlert(session: SessionPayload, input: CapacityAlertInput) {
  if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline login required");
  if (!canManageCapacityAlerts(session)) throw new Error("Manager access required");
  validateCapacityAlertInput(input);

  const candidates = await listCapacityAlertCandidates(session);
  const routeByKey = new Map(candidates.map((route) => [route.key, route]));
  const routes = Array.from(new Set(input.routeKeys)).map((key) => routeByKey.get(key));
  if (routes.some((route) => !route)) throw new Error("Capacity alert route is not available");
  const selectedRoutes = routes.filter(Boolean) as CapacityAlertRoute[];
  if (input.targetGsaCompanyId && !selectedRoutes.some((route) => route.gsaCompanyId === input.targetGsaCompanyId)) {
    throw new Error("Selected target GSA does not own any selected route");
  }
  const airlineCompanyIds = new Set(selectedRoutes.map((route) => route.airlineCompanyId).filter(Boolean));
  if (airlineCompanyIds.size > 1) throw new Error("Capacity alert can only cover one airline company");

  const now = new Date().toISOString();
  const alert: CapacityAlert = {
    id: createId("cap"),
    airline: selectedRoutes[0]?.airline ?? session.company,
    airlineCompanyId: selectedRoutes[0]?.airlineCompanyId ?? session.companyId,
    routes: selectedRoutes,
    availableKg: Number(input.availableKg),
    totalCapacityKg: Number(input.totalCapacityKg),
    urgency: input.urgency ?? "urgent",
    message: input.message.trim(),
    targetGsaCompanyId: input.targetGsaCompanyId || undefined,
    sentTo: resolveSentTo(selectedRoutes, input.targetGsaCompanyId),
    status: "active",
    responses: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: session.email,
  };

  const store = await readStore();
  store.alerts.unshift(alert);
  await writeStore(store);
  return alert;
}

export async function updateCapacityAlert(session: SessionPayload, id: string, input: CapacityAlertUpdateInput) {
  const store = await readStore();
  const index = store.alerts.findIndex((alert) => alert.id === id);
  if (index < 0) return null;
  const current = store.alerts[index];
  if (!canEditCapacityAlert(session, current)) throw new Error("Capacity alert not found");
  if (!canManageCapacityAlerts(session)) throw new Error("Manager access required");
  if (input.status && !STATUSES.has(input.status)) throw new Error("Capacity alert status is invalid");

  const alert: CapacityAlert = {
    ...current,
    status: input.status ?? current.status,
    updatedAt: new Date().toISOString(),
  };
  store.alerts[index] = alert;
  await writeStore(store);
  return alert;
}

function validateCapacityAlertInput(input: CapacityAlertInput) {
  if (!input.routeKeys?.length) throw new Error("Capacity alert needs at least one assigned route");
  if (!Number.isFinite(Number(input.availableKg)) || Number(input.availableKg) <= 0) throw new Error("Available capacity must be greater than zero");
  if (!Number.isFinite(Number(input.totalCapacityKg)) || Number(input.totalCapacityKg) <= 0) throw new Error("Total capacity must be greater than zero");
  if (Number(input.availableKg) > Number(input.totalCapacityKg)) throw new Error("Available capacity cannot exceed total capacity");
  if (!input.message?.trim()) throw new Error("Capacity alert message is required");
  if (input.urgency && !URGENCIES.has(input.urgency)) throw new Error("Capacity alert urgency is invalid");
}

async function listVisibleAlertContracts(session: SessionPayload) {
  return (await listLivePartnerContracts()).filter((contract) => canViewContract(session, contract));
}

function contractToAlertRoutes(contract: LivePartnerContract): CapacityAlertRoute[] {
  return contract.contractRoutes
    .filter((route) => route.status === "assigned")
    .map((route) => ({
      key: `${contract.id}::${route.id}`,
      routeId: route.id,
      contractId: contract.id,
      tenderId: contract.tenderId,
      airline: contract.airline,
      airlineCompanyId: contract.airlineCompanyId,
      gsaName: contract.gsaName,
      gsaCompanyId: contract.gsaCompanyId,
      origin: route.origin,
      destination: route.destination,
      operatingDays: route.operatingDays,
      weekday: route.weekday,
      frequencyPerWeek: route.frequencyPerWeek,
      aircraft: route.aircraft,
    }));
}

function canViewCapacityAlert(session: SessionPayload, alert: CapacityAlert) {
  if (session.role === "admin") return true;
  if (session.role === "airline") {
    if (alert.airlineCompanyId && session.companyId) return alert.airlineCompanyId === session.companyId;
    return alert.createdBy.toLowerCase() === session.email.toLowerCase();
  }
  if (session.role === "gsa") {
    if (alert.status !== "active") return false;
    if (alert.targetGsaCompanyId && session.companyId) return alert.targetGsaCompanyId === session.companyId;
    return alert.routes.some((route) => route.gsaCompanyId && route.gsaCompanyId === session.companyId);
  }
  return false;
}

function canEditCapacityAlert(session: SessionPayload, alert: CapacityAlert) {
  if (session.role === "admin") return true;
  if (session.role !== "airline") return false;
  if (alert.airlineCompanyId && session.companyId) return alert.airlineCompanyId === session.companyId;
  return alert.createdBy.toLowerCase() === session.email.toLowerCase();
}

function canManageCapacityAlerts(session: SessionPayload) {
  return session.role === "admin" || session.accessRole === undefined || ["owner", "admin", "manager"].includes(session.accessRole);
}

function resolveSentTo(routes: CapacityAlertRoute[], targetGsaCompanyId: string | undefined) {
  const names = Array.from(new Set(routes
    .filter((route) => !targetGsaCompanyId || route.gsaCompanyId === targetGsaCompanyId)
    .map((route) => route.gsaName)));
  return targetGsaCompanyId ? names[0] ?? "Selected GSA" : `${names.length} GSA partner${names.length === 1 ? "" : "s"}`;
}

async function readStore(): Promise<CapacityAlertStore> {
  const dbStore = await readStoreFromPostgres();
  if (dbStore) {
    if (dbStore.alerts.length > 0) return dbStore;
    const legacyStore = await readLegacyStore();
    if (legacyStore.alerts.length > 0) {
      await writeStoreToPostgres(legacyStore);
      return legacyStore;
    }
    return dbStore;
  }

  return readLegacyStore();
}

async function writeStore(store: CapacityAlertStore) {
  const saved = await writeStoreToPostgres(store);
  if (saved) return;

  assertFileStoreFallbackAllowed("Capacity alert store");
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(normalizeStore(store), null, 2)}\n`, "utf-8");
}

function normalizeStore(store: Partial<CapacityAlertStore>): CapacityAlertStore {
  return { alerts: store.alerts ?? [] };
}

async function readStoreFromPostgres(): Promise<CapacityAlertStore | null> {
  return withPostgres(async (client) => {
    const result = await client.query("select data from public.capacity_alerts order by created_at desc");
    return normalizeStore({ alerts: result.rows.map((row) => rowData<CapacityAlert>(row)) });
  });
}

async function readLegacyStore(): Promise<CapacityAlertStore> {
  const dbStore = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [LEGACY_STORE_KEY]);
    return result.rows[0] ? normalizeStore(rowData<Partial<CapacityAlertStore>>(result.rows[0])) : null;
  });
  if (dbStore) return dbStore;

  assertFileStoreFallbackAllowed("Capacity alert store");
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return normalizeStore(JSON.parse(raw) as Partial<CapacityAlertStore>);
  } catch {
    return { alerts: [] };
  }
}

async function writeStoreToPostgres(store: CapacityAlertStore) {
  return withPostgresTransaction(async (client) => {
    await client.query("delete from public.capacity_alerts");
    for (const alert of normalizeStore(store).alerts) {
      await client.query(
        `insert into public.capacity_alerts
          (id, airline_company_id, target_gsa_company_id, status, urgency, data, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
        [
          alert.id,
          alert.airlineCompanyId ?? null,
          alert.targetGsaCompanyId ?? null,
          alert.status,
          alert.urgency,
          JSON.stringify(alert),
          alert.createdAt,
          alert.updatedAt,
        ],
      );
    }
    return true;
  });
}
