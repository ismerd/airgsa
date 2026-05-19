import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionPayload } from "@/lib/auth/session";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";

const STORE_PATH = path.join(process.cwd(), "data", "user-state.json");
const AIRLINE_APPLICATIONS_STATE_KEY = "airline-applications-seen";
const GSA_TENDERS_STATE_KEY = "gsa-tenders-seen";
let fileStoreChain = Promise.resolve();

type UserStateRow = {
  sessionKey: string;
  key: string;
  updatedAt: string;
  data: unknown;
};

type UserStateStore = {
  states: UserStateRow[];
};

export type AirlineApplicationSeenState = {
  lastSeenAt: number;
  tenderSeenAt: Record<string, number>;
};

export type GsaTenderSeenState = {
  seenTenderIds: Record<string, number>;
};

const EMPTY_AIRLINE_APPLICATION_STATE: AirlineApplicationSeenState = {
  lastSeenAt: 0,
  tenderSeenAt: {},
};

const EMPTY_GSA_TENDER_STATE: GsaTenderSeenState = {
  seenTenderIds: {},
};

export async function getAirlineApplicationSeenState(session: SessionPayload): Promise<AirlineApplicationSeenState> {
  if (session.role !== "airline" && session.role !== "admin") return EMPTY_AIRLINE_APPLICATION_STATE;
  const data = await readUserState<Partial<AirlineApplicationSeenState>>(getSessionKey(session), AIRLINE_APPLICATIONS_STATE_KEY);
  return normalizeAirlineApplicationSeenState(data);
}

export async function updateAirlineApplicationSeenState(
  session: SessionPayload,
  input: { markAllSeen?: boolean; tenderId?: string; latestPendingSubmittedAt?: number },
): Promise<AirlineApplicationSeenState> {
  if (session.role !== "airline" && session.role !== "admin") throw new Error("Airline login required");

  const current = await getAirlineApplicationSeenState(session);
  const now = Date.now();
  const next: AirlineApplicationSeenState = {
    ...current,
    tenderSeenAt: { ...current.tenderSeenAt },
  };

  if (input.markAllSeen) next.lastSeenAt = Math.max(current.lastSeenAt, now);
  if (input.tenderId?.trim()) {
    const seenAt = Math.max(now, normalizeTimestamp(input.latestPendingSubmittedAt));
    next.tenderSeenAt[input.tenderId.trim()] = Math.max(next.tenderSeenAt[input.tenderId.trim()] ?? 0, seenAt);
  }

  await writeUserState(getSessionKey(session), AIRLINE_APPLICATIONS_STATE_KEY, next);
  return next;
}

export async function getGsaTenderSeenState(session: SessionPayload): Promise<GsaTenderSeenState> {
  if (session.role !== "gsa" && session.role !== "admin") return EMPTY_GSA_TENDER_STATE;
  const data = await readUserState<Partial<GsaTenderSeenState>>(getSessionKey(session), GSA_TENDERS_STATE_KEY);
  return normalizeGsaTenderSeenState(data);
}

export async function updateGsaTenderSeenState(
  session: SessionPayload,
  input: { tenderIds?: string[]; markAllSeenIds?: string[] },
): Promise<GsaTenderSeenState> {
  if (session.role !== "gsa" && session.role !== "admin") throw new Error("GSA login required");

  const current = await getGsaTenderSeenState(session);
  const now = Date.now();
  const next: GsaTenderSeenState = {
    seenTenderIds: { ...current.seenTenderIds },
  };
  for (const id of [...(input.tenderIds ?? []), ...(input.markAllSeenIds ?? [])]) {
    const normalized = id.trim();
    if (normalized) next.seenTenderIds[normalized] = Math.max(next.seenTenderIds[normalized] ?? 0, now);
  }

  await writeUserState(getSessionKey(session), GSA_TENDERS_STATE_KEY, next);
  return next;
}

function getSessionKey(session: SessionPayload) {
  return [
    session.role,
    session.companyId?.trim().toLowerCase() || session.email.trim().toLowerCase() || session.company.trim().toLowerCase(),
  ].join(":");
}

function normalizeAirlineApplicationSeenState(input: Partial<AirlineApplicationSeenState> | null | undefined): AirlineApplicationSeenState {
  const tenderSeenAt = Object.fromEntries(
    Object.entries(input?.tenderSeenAt ?? {})
      .map(([key, value]) => [key, normalizeTimestamp(value)] as const)
      .filter(([, value]) => value > 0),
  );

  return {
    lastSeenAt: normalizeTimestamp(input?.lastSeenAt),
    tenderSeenAt,
  };
}

function normalizeGsaTenderSeenState(input: Partial<GsaTenderSeenState> | null | undefined): GsaTenderSeenState {
  return {
    seenTenderIds: Object.fromEntries(
      Object.entries(input?.seenTenderIds ?? {})
        .map(([key, value]) => [key, normalizeTimestamp(value)] as const)
        .filter(([key, value]) => key.trim() && value > 0),
    ),
  };
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    const date = new Date(value).getTime();
    if (Number.isFinite(date)) return date;
  }
  return 0;
}

async function readUserState<T>(sessionKey: string, key: string): Promise<T | null> {
  const dbState = await withPostgres(async (client) => {
    const result = await client.query(
      "select data from public.workflow_user_state where session_key = $1 and key = $2",
      [sessionKey, key],
    );
    return { data: result.rows[0] ? rowData<T>(result.rows[0]) : null };
  });
  if (dbState) return dbState.data;

  const store = await readFileStore();
  const row = store.states.find((item) => item.sessionKey === sessionKey && item.key === key);
  return (row?.data as T | undefined) ?? null;
}

async function writeUserState(sessionKey: string, key: string, data: unknown) {
  const updatedAt = new Date().toISOString();
  const saved = await withPostgres(async (client) => {
    await client.query(
      `
        insert into public.workflow_user_state (session_key, key, data, updated_at)
        values ($1, $2, $3::jsonb, $4)
        on conflict (session_key, key)
        do update set data = excluded.data, updated_at = excluded.updated_at
      `,
      [sessionKey, key, JSON.stringify(data), updatedAt],
    );
    return true;
  });
  if (saved) return;

  await withFileStoreLock(async () => {
    const store = await readFileStore();
    const index = store.states.findIndex((item) => item.sessionKey === sessionKey && item.key === key);
    const row: UserStateRow = { sessionKey, key, updatedAt, data };
    if (index >= 0) store.states[index] = row;
    else store.states.push(row);
    await writeFileStore(store);
  });
}

async function readFileStore(): Promise<UserStateStore> {
  assertFileStoreFallbackAllowed("User state store");
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<UserStateStore>;
    return { states: Array.isArray(parsed.states) ? parsed.states : [] };
  } catch {
    return { states: [] };
  }
}

async function writeFileStore(store: UserStateStore) {
  assertFileStoreFallbackAllowed("User state store");
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  const temporaryPath = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify({ states: store.states }, null, 2)}\n`, "utf-8");
  await rename(temporaryPath, STORE_PATH);
}

function withFileStoreLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = fileStoreChain.then(operation, operation);
  fileStoreChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
