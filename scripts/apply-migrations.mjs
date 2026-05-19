import "./load-env.mjs";
import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to apply migrations.");
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), "db", "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseDatabaseSsl(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false,
});

await client.connect();

try {
  await client.query(`
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  await ensureRailwayCompatibilityBase(client);

  const appliedResult = await client.query("select version from public.schema_migrations");
  const applied = new Set(appliedResult.rows.map((row) => row.version));
  const pending = migrationFiles.filter((file) => !applied.has(file));

  for (const file of pending) {
    const sql = makeRailwayCompatibleSql(await readFile(path.join(migrationsDir, file), "utf8"));
    console.log(`Applying ${file}`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.schema_migrations (version) values ($1)", [file]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    applied: pending.length,
    skipped: migrationFiles.length - pending.length,
    migrations: pending,
  }, null, 2));
} finally {
  await client.end();
}

function shouldUseDatabaseSsl(url) {
  return process.env.DATABASE_SSL === "true" || url.includes("sslmode=require");
}

function makeRailwayCompatibleSql(sql) {
  return sql.replace(/\s+to\s+authenticated\b/gi, "");
}

async function ensureRailwayCompatibilityBase(client) {
  await client.query(`
    create extension if not exists "pgcrypto";

    do $$
    begin
      create type public.user_role as enum ('airline', 'gsa', 'admin');
    exception
      when duplicate_object then null;
    end $$;

    do $$
    begin
      create type public.company_type as enum ('airline', 'gsa', 'platform');
    exception
      when duplicate_object then null;
    end $$;

    do $$
    begin
      alter type public.company_type add value if not exists 'platform';
    exception
      when undefined_object then null;
    end $$;

    create schema if not exists auth;

    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text unique,
      created_at timestamptz not null default now()
    );

    create table if not exists public.companies (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      company_type public.company_type not null,
      headquarters text,
      website text,
      created_at timestamptz not null default now()
    );

    create table if not exists public.users (
      id uuid primary key references auth.users(id) on delete cascade,
      email text not null unique,
      full_name text not null,
      role public.user_role not null,
      company_id uuid references public.companies(id) on delete set null,
      created_at timestamptz not null default now()
    );

    create table if not exists public.tenders (
      id uuid primary key default gen_random_uuid(),
      airline_company_id uuid references public.companies(id) on delete cascade,
      title text not null default '',
      status text not null default 'draft',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists public.contracts (
      id uuid primary key default gen_random_uuid(),
      tender_id uuid references public.tenders(id) on delete set null,
      airline_company_id uuid references public.companies(id) on delete cascade,
      gsa_company_id uuid references public.companies(id) on delete cascade,
      market text not null default '',
      start_date date not null default current_date,
      end_date date,
      status text not null default 'pending',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists public.contract_routes (
      id uuid primary key default gen_random_uuid(),
      contract_id uuid not null references public.contracts(id) on delete cascade,
      origin text not null default '',
      destination text not null default '',
      status text not null default 'available',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.mandate_quotes (
      id uuid primary key default gen_random_uuid(),
      contract_id uuid not null references public.contracts(id) on delete cascade,
      route_id uuid references public.contract_routes(id) on delete set null,
      customer text not null default '',
      origin text not null default '',
      destination text not null default '',
      status text not null default 'draft',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.mandate_bookings (
      id uuid primary key default gen_random_uuid(),
      quote_id uuid references public.mandate_quotes(id) on delete set null,
      contract_id uuid not null references public.contracts(id) on delete cascade,
      route_id uuid references public.contract_routes(id) on delete set null,
      awb_number text not null default '',
      customer text not null default '',
      origin text not null default '',
      destination text not null default '',
      status text not null default 'booked',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.control_actions (
      id uuid primary key default gen_random_uuid(),
      contract_id uuid not null references public.contracts(id) on delete cascade,
      title text not null default '',
      status text not null default 'open',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.control_action_comments (
      id uuid primary key default gen_random_uuid(),
      action_id uuid references public.control_actions(id) on delete cascade,
      contract_id uuid not null references public.contracts(id) on delete cascade,
      body text,
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists public.monthly_contract_reports (
      id uuid primary key default gen_random_uuid(),
      contract_id uuid not null references public.contracts(id) on delete cascade,
      period text not null default '',
      status text not null default 'draft',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.mandate_audit_events (
      id uuid primary key default gen_random_uuid(),
      contract_id uuid references public.contracts(id) on delete cascade,
      entity_type text not null default '',
      entity_id text not null default '',
      action text not null default '',
      summary text not null default '',
      actor_email text,
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists public.platform_campaigns (
      id text primary key,
      author_role text not null default 'airline',
      author_company_id text,
      status text not null default 'draft',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.capacity_alerts (
      id text primary key,
      airline_company_id text,
      target_gsa_company_id text,
      status text not null default 'active',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.news_posts (
      id uuid primary key default gen_random_uuid(),
      title text not null default '',
      source text not null default '',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists public.linkedin_sources (
      id uuid primary key default gen_random_uuid(),
      name text not null default '',
      url text not null unique,
      status text not null default 'active',
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
  `);
}
