import { Pool, type PoolClient, type QueryResultRow } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function cleanEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^["']|["']$/g, "");
}

export function getDatabaseUrl() {
  const explicitUrl =
    cleanEnvValue(process.env.DATABASE_URL) ??
    cleanEnvValue(process.env.POSTGRES_URL) ??
    cleanEnvValue(process.env.DATABASE_PRIVATE_URL) ??
    cleanEnvValue(process.env.DATABASE_PUBLIC_URL) ??
    cleanEnvValue(process.env.POSTGRES_PRIVATE_URL) ??
    cleanEnvValue(process.env.POSTGRES_PUBLIC_URL);

  if (explicitUrl) return explicitUrl;

  const host = cleanEnvValue(process.env.PGHOST);
  const port = cleanEnvValue(process.env.PGPORT) ?? "5432";
  const user = cleanEnvValue(process.env.PGUSER);
  const password = cleanEnvValue(process.env.PGPASSWORD);
  const database = cleanEnvValue(process.env.PGDATABASE);

  if (!host || !user || !password || !database) return undefined;
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

export function getPostgresRuntimeDiagnostics() {
  const candidates = [
    "DATABASE_URL",
    "POSTGRES_URL",
    "DATABASE_PRIVATE_URL",
    "DATABASE_PUBLIC_URL",
    "POSTGRES_PRIVATE_URL",
    "POSTGRES_PUBLIC_URL",
    "PGHOST",
    "PGPORT",
    "PGUSER",
    "PGPASSWORD",
    "PGDATABASE",
  ];
  const presentVariables = candidates.filter((name) => Boolean(cleanEnvValue(process.env[name])));
  const databaseUrl = getDatabaseUrl();

  return {
    hasDatabaseUrl: Boolean(databaseUrl),
    presentVariables,
    nodeEnv: process.env.NODE_ENV ?? null,
    databaseSsl: process.env.DATABASE_SSL ?? null,
  };
}

export function hasPostgres() {
  return Boolean(getDatabaseUrl());
}

export function canUseFileStoreFallback() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_FILE_STORE_FALLBACK === "true";
}

export function assertFileStoreFallbackAllowed(storeName: string): void {
  if (canUseFileStoreFallback()) return;
  throw new Error(`${storeName} requires Postgres connection variables in production. File-store fallback is disabled.`);
}

function getPool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  if (!pool) {
    const useSsl = process.env.DATABASE_SSL === "true" || databaseUrl.includes("sslmode=require");
    pool = new Pool({
      connectionString: databaseUrl,
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

      create table if not exists auth_accounts (
        id text primary key,
        email text not null unique,
        password_hash text not null,
        password_salt text not null,
        role text not null check (role in ('airline', 'gsa', 'admin')),
        access_role text check (access_role in ('owner', 'admin', 'manager', 'operator', 'viewer')),
        company text not null,
        company_id text,
        name text not null,
        status text not null check (status in ('active', 'disabled')),
        must_change_password boolean not null default true,
        created_at timestamptz not null,
        updated_at timestamptz not null default now(),
        data jsonb not null
      );

      create table if not exists auth_password_reset_tokens (
        id text primary key,
        account_id text not null,
        email text not null,
        token_hash text not null unique,
        expires_at timestamptz not null,
        used_at timestamptz,
        created_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists team_accounts (
        id text primary key,
        email text not null unique,
        auth_user_id text,
        role text not null check (role in ('airline', 'gsa')),
        access_role text not null check (access_role in ('owner', 'admin', 'manager', 'operator', 'viewer')),
        company text not null,
        company_id text,
        status text not null check (status in ('active', 'invited', 'disabled')),
        created_at timestamptz not null,
        invited_at timestamptz,
        last_invite_error text,
        updated_at timestamptz not null default now(),
        data jsonb not null
      );

      create table if not exists account_registrations (
        id text primary key,
        email text not null unique,
        role text not null check (role in ('airline', 'gsa')),
        company text not null,
        country text not null,
        status text not null check (status in ('pending', 'approved', 'rejected')),
        submitted_at timestamptz not null,
        reviewed_at timestamptz,
        data jsonb not null
      );

      alter table team_accounts add column if not exists auth_user_id text;
      alter table team_accounts add column if not exists invited_at timestamptz;
      alter table team_accounts add column if not exists last_invite_error text;
      alter table if exists workflow_email_deliveries drop constraint if exists workflow_email_deliveries_provider_check;

      create table if not exists fr24_runtime_settings (
        id text primary key default 'default',
        enabled boolean not null default false,
        updated_at timestamptz not null default now(),
        data jsonb not null default '{}'::jsonb,
        constraint fr24_runtime_settings_singleton check (id = 'default')
      );

      create table if not exists workflow_airline_profiles (
        tenant_key text primary key,
        airline_company_id text,
        airline_email text,
        logo_path text,
        data jsonb not null default '{}'::jsonb,
        updated_at timestamptz not null default now()
      );

      create table if not exists workflow_attachments (
        id text primary key,
        contract_id text,
        entity_id text,
        entity_type text not null,
        airline_company_id text,
        airline_email text,
        gsa_company_id text,
        gsa_email text,
        visibility text not null default 'application',
        file_name text not null,
        mime_type text not null,
        size_bytes integer not null default 0,
        storage text not null check (storage in ('file')),
        storage_path text not null,
        created_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists workflow_email_deliveries (
        id text primary key,
        notification_id text not null,
        recipient_email text,
        recipient_company_id text,
        recipient_role text not null check (recipient_role in ('airline', 'gsa', 'admin')),
        provider text not null check (provider in ('resend', 'smtp', 'webhook', 'disabled', 'skipped')),
        status text not null check (status in ('sent', 'queued', 'skipped', 'failed')),
        status_code integer,
        error text,
        subject text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      alter table workflow_email_deliveries drop constraint if exists workflow_email_deliveries_provider_check;
      alter table workflow_email_deliveries
        add constraint workflow_email_deliveries_provider_check
        check (provider in ('resend', 'smtp', 'webhook', 'disabled', 'skipped'));

      create table if not exists workflow_user_state (
        session_key text not null,
        key text not null,
        data jsonb not null default '{}'::jsonb,
        updated_at timestamptz not null default now(),
        primary key (session_key, key)
      );

      create table if not exists workflow_mandate_quotes (
        id text primary key,
        contract_id text not null,
        airline_company_id text,
        gsa_company_id text,
        status text not null check (status in ('draft', 'auto-approved', 'airline-approval-required', 'airline-approved', 'airline-rejected', 'countered', 'declined', 'expired')),
        deadline timestamptz,
        created_at timestamptz not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists workflow_mandate_bookings (
        id text primary key,
        contract_id text not null,
        quote_id text,
        airline_company_id text,
        gsa_company_id text,
        status text not null check (status in ('booked', 'flown', 'cancelled')),
        created_at timestamptz not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists workflow_control_actions (
        id text primary key,
        contract_id text not null,
        airline_company_id text,
        gsa_company_id text,
        status text not null check (status in ('open', 'in-progress', 'completed', 'cancelled')),
        severity text not null check (severity in ('info', 'warning', 'critical')),
        due_date date,
        created_at timestamptz not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists workflow_control_action_comments (
        id text primary key,
        action_id text not null,
        contract_id text not null,
        airline_company_id text,
        gsa_company_id text,
        created_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists workflow_monthly_reports (
        id text primary key,
        contract_id text not null,
        airline_company_id text,
        gsa_company_id text,
        period text not null,
        status text not null check (status in ('draft', 'submitted', 'accepted', 'changes-requested', 'rejected')),
        version integer not null default 1,
        created_at timestamptz not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists workflow_audit_events (
        id text primary key,
        contract_id text,
        entity_type text not null,
        entity_id text not null,
        actor_email text,
        actor_role text,
        created_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists workflow_notifications (
        id text primary key,
        recipient_role text not null check (recipient_role in ('airline', 'gsa', 'admin')),
        recipient_company_id text,
        recipient_email text,
        type text not null check (type in ('control-action', 'monthly-report', 'quote', 'booking', 'system')),
        entity_id text not null,
        read_at timestamptz,
        created_at timestamptz not null,
        data jsonb not null
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
      create index if not exists auth_accounts_role_company_idx on auth_accounts(role, company_id, company);
      create index if not exists auth_accounts_status_idx on auth_accounts(status, updated_at desc);
      create index if not exists auth_password_reset_tokens_account_idx on auth_password_reset_tokens(account_id, created_at desc);
      create index if not exists auth_password_reset_tokens_expires_idx on auth_password_reset_tokens(expires_at);
      create index if not exists team_accounts_company_idx on team_accounts(role, company_id, company);
      create index if not exists team_accounts_status_idx on team_accounts(status, updated_at desc);
      create index if not exists team_accounts_auth_user_idx on team_accounts(auth_user_id);
      create index if not exists account_registrations_status_idx on account_registrations(status, submitted_at desc);
      create index if not exists account_registrations_role_idx on account_registrations(role, submitted_at desc);
      create index if not exists workflow_airline_profiles_email_idx on workflow_airline_profiles(lower(airline_email));
      create index if not exists workflow_attachments_contract_idx on workflow_attachments(contract_id, created_at desc);
      create index if not exists workflow_attachments_entity_idx on workflow_attachments(entity_type, entity_id, created_at desc);
      create index if not exists workflow_attachments_airline_idx on workflow_attachments(airline_company_id, created_at desc);
      create index if not exists workflow_attachments_gsa_idx on workflow_attachments(gsa_company_id, created_at desc);
      create index if not exists workflow_email_deliveries_notification_idx on workflow_email_deliveries(notification_id, created_at desc);
      create index if not exists workflow_email_deliveries_recipient_idx on workflow_email_deliveries(recipient_role, recipient_company_id, created_at desc);
      create index if not exists workflow_email_deliveries_status_idx on workflow_email_deliveries(status, updated_at desc);
      create index if not exists workflow_user_state_updated_idx on workflow_user_state(key, updated_at desc);
      create index if not exists workflow_mandate_quotes_contract_idx on workflow_mandate_quotes(contract_id, created_at desc);
      create index if not exists workflow_mandate_quotes_status_idx on workflow_mandate_quotes(status, updated_at desc);
      create index if not exists workflow_mandate_bookings_contract_idx on workflow_mandate_bookings(contract_id, created_at desc);
      create index if not exists workflow_mandate_bookings_quote_idx on workflow_mandate_bookings(quote_id);
      create index if not exists workflow_control_actions_contract_idx on workflow_control_actions(contract_id, status, updated_at desc);
      create index if not exists workflow_control_action_comments_action_idx on workflow_control_action_comments(action_id, created_at);
      create index if not exists workflow_monthly_reports_contract_period_idx on workflow_monthly_reports(contract_id, period);
      create index if not exists workflow_audit_events_contract_idx on workflow_audit_events(contract_id, created_at desc);
      create index if not exists workflow_audit_events_entity_idx on workflow_audit_events(entity_type, entity_id);
      create index if not exists workflow_notifications_recipient_idx on workflow_notifications(recipient_role, recipient_company_id, created_at desc);
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
