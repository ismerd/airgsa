import { Pool, type PoolClient, type QueryResultRow } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function hasPostgres() {
  return Boolean(process.env.DATABASE_URL);
}

export function canUseFileStoreFallback() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_FILE_STORE_FALLBACK === "true";
}

export function assertFileStoreFallbackAllowed(storeName: string): void {
  if (canUseFileStoreFallback()) return;
  throw new Error(`${storeName} requires DATABASE_URL in production. File-store fallback is disabled.`);
}

function getPool() {
  if (!process.env.DATABASE_URL) return null;

  if (!pool) {
    const useSsl = process.env.DATABASE_SSL === "true" || process.env.DATABASE_URL.includes("sslmode=require");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

async function ensureSchema() {
  if (!hasPostgres()) return;
  if (!schemaReady) {
    schemaReady = getPool()!.query(`
      create table if not exists app_settings (
        key text primary key,
        value jsonb not null,
        updated_at timestamptz not null default now()
      );

      create table if not exists live_tenders (
        id text primary key,
        status text not null check (status in ('draft', 'open', 'closed')),
        created_at timestamptz not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists live_applications (
        id text primary key,
        tender_id text not null,
        gsa_id text not null,
        gsa_name text not null,
        status text not null check (status in ('pending', 'shortlisted', 'accepted', 'rejected')),
        submitted_at timestamptz not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists live_partner_contracts (
        id text primary key,
        tender_id text not null,
        application_id text not null,
        airline_email text not null,
        gsa_id text not null,
        status text not null check (status in ('pending', 'active', 'suspended', 'closed')),
        created_at timestamptz not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists airline_fleet_aircraft (
        registration text primary key,
        airline_icao text not null,
        status text not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      create index if not exists live_tenders_status_idx on live_tenders(status);
      create index if not exists live_applications_tender_idx on live_applications(tender_id);
      create index if not exists live_applications_status_idx on live_applications(status);
      create unique index if not exists live_applications_tender_gsa_idx on live_applications(tender_id, gsa_id);
      create index if not exists live_partner_contracts_tender_idx on live_partner_contracts(tender_id);
      create index if not exists live_partner_contracts_application_idx on live_partner_contracts(application_id);
      create unique index if not exists live_partner_contracts_application_unique_idx on live_partner_contracts(application_id);
      create index if not exists live_partner_contracts_airline_idx on live_partner_contracts(airline_email);
      create index if not exists live_partner_contracts_status_idx on live_partner_contracts(status);
      create index if not exists airline_fleet_aircraft_airline_idx on airline_fleet_aircraft(airline_icao);
    `).then(() => undefined);
  }

  await schemaReady;
}

export async function withPostgres<T>(operation: (client: Pool) => Promise<T>): Promise<T | null> {
  const client = getPool();
  if (!client) return null;

  try {
    await ensureSchema();
    return await operation(client);
  } catch (err) {
    if (!canUseFileStoreFallback()) throw err;
    console.warn("[postgres] falling back to file store:", (err as Error).message);
    return null;
  }
}

export async function withPostgresTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T | null> {
  const poolClient = getPool();
  if (!poolClient) return null;

  let connection: PoolClient | null = null;
  try {
    await ensureSchema();
    connection = await poolClient.connect();
    await connection.query("begin");
    const result = await operation(connection);
    await connection.query("commit");
    return result;
  } catch (err) {
    if (connection) await connection.query("rollback").catch(() => undefined);
    if (!canUseFileStoreFallback()) throw err;
    console.warn("[postgres] falling back to file store:", (err as Error).message);
    return null;
  } finally {
    connection?.release();
  }
}

export function rowData<T>(row: QueryResultRow): T {
  return row.data as T;
}
