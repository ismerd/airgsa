create extension if not exists "pgcrypto";

do $$
begin
  create role authenticated;
exception
  when duplicate_object then null;
  when insufficient_privilege then null;
end $$;

create schema if not exists auth;
create schema if not exists storage;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select null::uuid
$$;

create or replace function auth.email()
returns text
language sql
stable
as $$
  select null::text
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id) on delete cascade,
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  metadata jsonb
);

alter table storage.objects enable row level security;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_accounts (
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

create table if not exists public.auth_password_reset_tokens (
  id text primary key,
  account_id text not null,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null,
  data jsonb not null
);

create table if not exists public.team_accounts (
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

create table if not exists public.account_registrations (
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

create table if not exists public.fr24_runtime_settings (
  id text primary key default 'default',
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  constraint fr24_runtime_settings_singleton check (id = 'default')
);

create table if not exists public.workflow_airline_profiles (
  tenant_key text primary key,
  airline_company_id text,
  airline_email text,
  logo_path text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_gsa_profiles (
  tenant_key text primary key,
  gsa_company_id text,
  gsa_email text,
  logo_path text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_attachments (
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

create table if not exists public.workflow_email_deliveries (
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

create table if not exists public.workflow_user_state (
  session_key text not null,
  key text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (session_key, key)
);

create type public.user_role as enum ('airline', 'gsa', 'admin');
create type public.company_type as enum ('airline', 'gsa', 'platform');
create type public.tender_status as enum ('draft', 'open', 'closed');
create type public.application_status as enum ('pending', 'shortlisted', 'accepted', 'rejected');
create type public.contract_status as enum ('pending', 'active', 'suspended', 'closed');
create type public.news_category as enum (
  'GSA opportunity',
  'airline expansion',
  'new route',
  'cargo capacity',
  'tender/RFP',
  'partnership'
);
create type public.source_status as enum ('active', 'paused');
create type public.notification_status as enum ('unread', 'read');
create type public.aircraft_fleet_status as enum ('in_air', 'parked', 'tracking');
create type public.quote_status as enum ('draft', 'auto-approved', 'airline-approval-required', 'airline-approved', 'airline-rejected', 'countered', 'declined', 'expired');
create type public.booking_status as enum ('booked', 'flown', 'cancelled');
create type public.control_action_status as enum ('open', 'in-progress', 'completed', 'cancelled');
create type public.control_action_severity as enum ('info', 'warning', 'critical');
create type public.monthly_report_status as enum ('draft', 'submitted', 'accepted', 'changes-requested', 'rejected');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null,
  company_id uuid,
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_type public.company_type not null,
  headquarters text,
  website text,
  created_at timestamptz not null default now()
);

alter table public.users
  add constraint users_company_id_fkey foreign key (company_id) references public.companies(id) on delete set null;

create table public.airline_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  iata_code text,
  fleet_summary text,
  cargo_focus text,
  primary_hubs text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.gsa_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  coverage_markets text[] not null default '{}',
  certifications text[] not null default '{}',
  cargo_focus text,
  network_score numeric(5,2) default 0,
  financial_score numeric(5,2) default 0,
  compliance_score numeric(5,2) default 0,
  win_rate numeric(5,2) default 0,
  summary text,
  created_at timestamptz not null default now()
);

create table public.tenders (
  id uuid primary key default gen_random_uuid(),
  airline_company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  regions text[] not null default '{}',
  lanes text not null,
  annual_tonnage integer,
  product_mix text,
  expected_start text,
  requirements text[] not null default '{}',
  deadline date,
  status public.tender_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.tender_applications (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  gsa_company_id uuid not null references public.companies(id) on delete cascade,
  commercial_score numeric(5,2) default 0,
  network_score numeric(5,2) default 0,
  compliance_score numeric(5,2) default 0,
  proposed_commission text,
  proposal text,
  status public.application_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  unique (tender_id, gsa_company_id)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid references public.tenders(id) on delete set null,
  airline_company_id uuid not null references public.companies(id) on delete cascade,
  gsa_company_id uuid not null references public.companies(id) on delete cascade,
  market text not null,
  start_date date not null,
  end_date date,
  status public.contract_status not null default 'pending',
  document_path text,
  created_at timestamptz not null default now()
);

create table public.kpi_reports (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  revenue numeric(14,2) default 0,
  loadfactor numeric(5,2) default 0,
  yield_per_kg numeric(8,3) default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.live_tenders (
  id text primary key,
  status text not null check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  data jsonb not null
);

create table if not exists public.live_applications (
  id text primary key,
  tender_id text not null,
  gsa_id text not null,
  gsa_name text not null,
  status text not null check (status in ('pending', 'shortlisted', 'accepted', 'rejected')),
  submitted_at timestamptz not null,
  updated_at timestamptz not null,
  data jsonb not null,
  unique (tender_id, gsa_id)
);

create table if not exists public.live_partner_contracts (
  id text primary key,
  tender_id text not null,
  application_id text not null unique,
  airline_email text not null,
  gsa_id text not null,
  status text not null check (status in ('pending', 'active', 'suspended', 'closed')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  data jsonb not null
);

create table public.contract_routes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  origin text not null,
  destination text not null,
  frequency_per_week integer default 0,
  aircraft text,
  status text not null default 'available' check (status in ('available', 'assigned')),
  assigned_at timestamptz,
  assigned_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mandate_quotes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  route_id uuid references public.contract_routes(id) on delete set null,
  customer text not null,
  contact_name text,
  contact_email text,
  origin text not null,
  destination text not null,
  cargo_type text,
  weight_kg numeric(14,2) default 0,
  pieces integer default 0,
  requested_rate_per_kg numeric(12,3) default 0,
  floor_rate_per_kg numeric(12,3),
  flight_date date,
  deadline timestamptz,
  status public.quote_status not null default 'draft',
  decision_reason text,
  counter_rate_per_kg numeric(12,3),
  decided_at timestamptz,
  decided_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mandate_bookings (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.mandate_quotes(id) on delete set null,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  route_id uuid references public.contract_routes(id) on delete set null,
  awb_number text not null,
  customer text not null,
  origin text not null,
  destination text not null,
  weight_kg numeric(14,2) default 0,
  booked_weight_kg numeric(14,2),
  flown_weight_kg numeric(14,2),
  pieces integer default 0,
  rate_per_kg numeric(12,3) default 0,
  revenue_amount numeric(14,2) default 0,
  booked_revenue_amount numeric(14,2),
  final_revenue_amount numeric(14,2),
  currency text not null default 'EUR',
  flight_number text,
  flight_date date,
  status public.booking_status not null default 'booked',
  reconciliation_status text not null default 'pending' check (reconciliation_status in ('pending', 'reconciled', 'disputed')),
  reconciliation_note text,
  cancelled_at timestamptz,
  cancelled_by text,
  cancellation_reason text,
  flown_at timestamptz,
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.control_actions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  title text not null,
  description text,
  severity public.control_action_severity not null default 'warning',
  status public.control_action_status not null default 'open',
  due_date date,
  assignee_name text,
  assignee_email text,
  gsa_response text,
  source_risk_reasons text[] not null default '{}',
  closed_at timestamptz,
  created_by text,
  last_updated_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.control_action_comments (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.control_actions(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  body text,
  attachment_name text,
  attachment_data_url text,
  attachment_mime_type text,
  attachment_size integer,
  created_by text,
  created_by_name text,
  created_by_role public.user_role,
  created_at timestamptz not null default now()
);

create table public.monthly_contract_reports (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  period text not null,
  status public.monthly_report_status not null default 'draft',
  version integer not null default 1,
  revisions jsonb not null default '[]'::jsonb,
  change_request_count integer not null default 0,
  reported_revenue numeric(14,2) default 0,
  reported_tonnage_kg numeric(14,2) default 0,
  reported_quotes integer default 0,
  reported_bookings integer default 0,
  summary text not null,
  pipeline_notes text,
  risks text,
  support_needed text,
  attachment_name text,
  attachment_data_url text,
  attachment_mime_type text,
  attachment_size integer,
  owner_name text,
  owner_email text,
  airline_review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  created_by text,
  last_updated_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, period)
);

create table public.mandate_audit_events (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  summary text not null,
  actor_email text,
  actor_name text,
  actor_role public.user_role,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.platform_campaigns (
  id text primary key,
  author_role text not null check (author_role in ('airline', 'gsa')),
  author_company_id text,
  status text not null check (status in ('draft', 'published', 'scheduled', 'archived')),
  data jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table public.capacity_alerts (
  id text primary key,
  airline_company_id text,
  target_gsa_company_id text,
  status text not null check (status in ('active', 'filled', 'recalled')),
  urgency text not null check (urgency in ('normal', 'urgent', 'critical')),
  data jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  title text not null,
  source text not null,
  source_url text,
  author_name text,
  author_url text,
  category public.news_category,
  market text,
  published_at timestamptz,
  summary text,
  confidence numeric(5,2) default 0,
  media jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.linkedin_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  category public.news_category,
  status public.source_status not null default 'active',
  last_import_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_news_posts (
  id text primary key,
  title text not null,
  source text not null,
  category text,
  market text,
  published_at timestamptz,
  summary text,
  confidence numeric(5,2) default 0,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_linkedin_sources (
  id text primary key,
  name text not null,
  url text not null unique,
  category text,
  status text not null check (status in ('active', 'paused')),
  last_import_at timestamptz,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.linkedin_import_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Default LinkedIn import',
  token_secret_name text not null default 'LINKEDIN_API_TOKEN',
  include_quote_posts boolean not null default true,
  include_reposts boolean not null default true,
  max_posts integer not null default 50,
  posted_limit text not null default 'any',
  lookback_value integer not null default 24,
  lookback_unit text not null default 'hours' check (lookback_unit in ('hours', 'days', 'weeks')),
  schedule_enabled boolean not null default true,
  schedule_value integer not null default 12,
  schedule_unit text not null default 'hours' check (schedule_unit in ('hours', 'days', 'weeks')),
  last_run_at timestamptz,
  next_run_at timestamptz,
  classification_mode text not null default 'manual' check (classification_mode in ('manual', 'openai')),
  scrape_comments boolean not null default false,
  scrape_reactions boolean not null default false,
  raw_request jsonb not null default '{}'::jsonb,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  title text not null,
  body text not null,
  status public.notification_status not null default 'unread',
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_mandate_quotes (
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

create table if not exists public.workflow_mandate_bookings (
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

create table if not exists public.workflow_control_actions (
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

create table if not exists public.workflow_control_action_comments (
  id text primary key,
  action_id text not null,
  contract_id text not null,
  airline_company_id text,
  gsa_company_id text,
  created_at timestamptz not null,
  data jsonb not null
);

create table if not exists public.workflow_monthly_reports (
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

create table if not exists public.workflow_audit_events (
  id text primary key,
  contract_id text,
  entity_type text not null,
  entity_id text not null,
  actor_email text,
  actor_role text,
  created_at timestamptz not null,
  data jsonb not null
);

create table if not exists public.workflow_notifications (
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

create table public.airline_fleet_aircraft (
  id uuid primary key default gen_random_uuid(),
  registration text not null unique,
  airline_icao text not null,
  airline_name text not null,
  aircraft_type text,
  aircraft_model text,
  status public.aircraft_fleet_status not null default 'tracking',
  current_fr24_id text,
  current_flight_number text,
  current_callsign text,
  origin_iata text,
  origin_icao text,
  destination_iata text,
  destination_icao text,
  parked_airport_iata text,
  parked_airport_icao text,
  parked_airport_name text,
  last_position_lat numeric(10,6),
  last_position_lng numeric(10,6),
  last_altitude integer,
  last_ground_speed integer,
  last_seen_live_at timestamptz,
  first_seen_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index tenders_status_deadline_idx on public.tenders(status, deadline);
create index tender_applications_tender_idx on public.tender_applications(tender_id);
create index kpi_reports_contract_period_idx on public.kpi_reports(contract_id, period_start);
create index if not exists live_tenders_status_idx on public.live_tenders(status);
create index if not exists live_applications_tender_idx on public.live_applications(tender_id);
create index if not exists live_applications_status_idx on public.live_applications(status);
create index if not exists live_partner_contracts_tender_idx on public.live_partner_contracts(tender_id);
create index if not exists live_partner_contracts_airline_idx on public.live_partner_contracts(airline_email);
create index if not exists live_partner_contracts_status_idx on public.live_partner_contracts(status);
create index contract_routes_contract_idx on public.contract_routes(contract_id, status);
create index mandate_quotes_contract_status_idx on public.mandate_quotes(contract_id, status);
create index mandate_bookings_contract_created_idx on public.mandate_bookings(contract_id, created_at desc);
create index control_actions_contract_status_idx on public.control_actions(contract_id, status);
create index control_action_comments_action_idx on public.control_action_comments(action_id, created_at);
create index monthly_contract_reports_contract_period_idx on public.monthly_contract_reports(contract_id, period);
create index mandate_audit_events_contract_created_idx on public.mandate_audit_events(contract_id, created_at desc);
create index platform_campaigns_author_idx on public.platform_campaigns(author_role, author_company_id, updated_at desc);
create index platform_campaigns_status_idx on public.platform_campaigns(status, updated_at desc);
create index capacity_alerts_airline_idx on public.capacity_alerts(airline_company_id, created_at desc);
create index capacity_alerts_gsa_idx on public.capacity_alerts(target_gsa_company_id, created_at desc);
create index capacity_alerts_status_idx on public.capacity_alerts(status, created_at desc);
create index if not exists team_accounts_company_idx on public.team_accounts(role, company_id, company);
create index if not exists team_accounts_status_idx on public.team_accounts(status, updated_at desc);
create index if not exists team_accounts_auth_user_idx on public.team_accounts(auth_user_id);
create index if not exists account_registrations_status_idx on public.account_registrations(status, submitted_at desc);
create index if not exists account_registrations_role_idx on public.account_registrations(role, submitted_at desc);
create index if not exists auth_accounts_role_company_idx on public.auth_accounts(role, company_id, company);
create index if not exists auth_accounts_status_idx on public.auth_accounts(status, updated_at desc);
create index if not exists auth_password_reset_tokens_account_idx on public.auth_password_reset_tokens(account_id, created_at desc);
create index if not exists auth_password_reset_tokens_expires_idx on public.auth_password_reset_tokens(expires_at);
create index if not exists workflow_airline_profiles_email_idx on public.workflow_airline_profiles(lower(airline_email));
create index if not exists workflow_gsa_profiles_email_idx on public.workflow_gsa_profiles(lower(gsa_email));
create index if not exists workflow_attachments_contract_idx on public.workflow_attachments(contract_id, created_at desc);
create index if not exists workflow_attachments_entity_idx on public.workflow_attachments(entity_type, entity_id, created_at desc);
create index if not exists workflow_attachments_airline_idx on public.workflow_attachments(airline_company_id, created_at desc);
create index if not exists workflow_attachments_gsa_idx on public.workflow_attachments(gsa_company_id, created_at desc);
create index if not exists workflow_email_deliveries_notification_idx on public.workflow_email_deliveries(notification_id, created_at desc);
create index if not exists workflow_email_deliveries_recipient_idx on public.workflow_email_deliveries(recipient_role, recipient_company_id, created_at desc);
create index if not exists workflow_email_deliveries_status_idx on public.workflow_email_deliveries(status, updated_at desc);
create index if not exists workflow_user_state_updated_idx on public.workflow_user_state(key, updated_at desc);
create index news_posts_category_published_idx on public.news_posts(category, published_at desc);
create index news_posts_external_id_idx on public.news_posts(external_id);
create index if not exists workflow_news_posts_published_idx on public.workflow_news_posts(published_at desc);
create index if not exists workflow_news_posts_category_idx on public.workflow_news_posts(category, published_at desc);
create index if not exists workflow_linkedin_sources_status_idx on public.workflow_linkedin_sources(status, updated_at desc);
create index notifications_user_status_idx on public.notifications(user_id, status);
create index if not exists workflow_mandate_quotes_contract_idx on public.workflow_mandate_quotes(contract_id, created_at desc);
create index if not exists workflow_mandate_quotes_status_idx on public.workflow_mandate_quotes(status, updated_at desc);
create index if not exists workflow_mandate_bookings_contract_idx on public.workflow_mandate_bookings(contract_id, created_at desc);
create index if not exists workflow_mandate_bookings_quote_idx on public.workflow_mandate_bookings(quote_id);
create index if not exists workflow_control_actions_contract_idx on public.workflow_control_actions(contract_id, status, updated_at desc);
create index if not exists workflow_control_action_comments_action_idx on public.workflow_control_action_comments(action_id, created_at);
create index if not exists workflow_monthly_reports_contract_period_idx on public.workflow_monthly_reports(contract_id, period);
create index if not exists workflow_audit_events_contract_idx on public.workflow_audit_events(contract_id, created_at desc);
create index if not exists workflow_audit_events_entity_idx on public.workflow_audit_events(entity_type, entity_id);
create index if not exists workflow_notifications_recipient_idx on public.workflow_notifications(recipient_role, recipient_company_id, created_at desc);
create index airline_fleet_aircraft_airline_status_idx on public.airline_fleet_aircraft(airline_icao, status);
create index airline_fleet_aircraft_updated_idx on public.airline_fleet_aircraft(updated_at desc);

alter table public.users enable row level security;
alter table public.app_settings enable row level security;
alter table public.auth_accounts enable row level security;
alter table public.auth_password_reset_tokens enable row level security;
alter table public.team_accounts enable row level security;
alter table public.account_registrations enable row level security;
alter table public.fr24_runtime_settings enable row level security;
alter table public.workflow_airline_profiles enable row level security;
alter table public.workflow_gsa_profiles enable row level security;
alter table public.workflow_attachments enable row level security;
alter table public.workflow_email_deliveries enable row level security;
alter table public.workflow_user_state enable row level security;
alter table public.companies enable row level security;
alter table public.airline_profiles enable row level security;
alter table public.gsa_profiles enable row level security;
alter table public.tenders enable row level security;
alter table public.tender_applications enable row level security;
alter table public.contracts enable row level security;
alter table public.kpi_reports enable row level security;
alter table public.live_tenders enable row level security;
alter table public.live_applications enable row level security;
alter table public.live_partner_contracts enable row level security;
alter table public.contract_routes enable row level security;
alter table public.mandate_quotes enable row level security;
alter table public.mandate_bookings enable row level security;
alter table public.control_actions enable row level security;
alter table public.control_action_comments enable row level security;
alter table public.monthly_contract_reports enable row level security;
alter table public.mandate_audit_events enable row level security;
alter table public.platform_campaigns enable row level security;
alter table public.capacity_alerts enable row level security;
alter table public.news_posts enable row level security;
alter table public.linkedin_sources enable row level security;
alter table public.workflow_news_posts enable row level security;
alter table public.workflow_linkedin_sources enable row level security;
alter table public.linkedin_import_configs enable row level security;
alter table public.notifications enable row level security;
alter table public.workflow_mandate_quotes enable row level security;
alter table public.workflow_mandate_bookings enable row level security;
alter table public.workflow_control_actions enable row level security;
alter table public.workflow_control_action_comments enable row level security;
alter table public.workflow_monthly_reports enable row level security;
alter table public.workflow_audit_events enable row level security;
alter table public.workflow_notifications enable row level security;
alter table public.airline_fleet_aircraft enable row level security;

create policy "authenticated read companies" on public.companies for select to authenticated using (true);
create policy "admins manage app settings" on public.app_settings
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "admins manage auth accounts" on public.auth_accounts
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "users read own auth account" on public.auth_accounts
  for select to authenticated
  using (id = auth.uid()::text or lower(email) = lower(coalesce(auth.email(), '')));
create policy "admins manage auth password reset tokens" on public.auth_password_reset_tokens
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "company managers read team accounts" on public.team_accounts
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            public.team_accounts.role = public.users.role::text
            and public.team_accounts.company_id = public.users.company_id::text
          )
        )
    )
  );
create policy "company managers manage team accounts" on public.team_accounts
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            public.team_accounts.role = public.users.role::text
            and public.team_accounts.company_id = public.users.company_id::text
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            public.team_accounts.role = public.users.role::text
            and public.team_accounts.company_id = public.users.company_id::text
          )
        )
    )
  );

create policy "admins manage account registrations" on public.account_registrations
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "authenticated read fr24 runtime settings" on public.fr24_runtime_settings
  for select to authenticated using (true);
create policy "admins manage fr24 runtime settings" on public.fr24_runtime_settings
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "airlines read own workflow profile" on public.workflow_airline_profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              public.workflow_airline_profiles.airline_company_id = public.users.company_id::text
              or lower(public.workflow_airline_profiles.airline_email) = lower(public.users.email)
            )
          )
        )
    )
  );
create policy "airlines manage own workflow profile" on public.workflow_airline_profiles
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              public.workflow_airline_profiles.airline_company_id = public.users.company_id::text
              or lower(public.workflow_airline_profiles.airline_email) = lower(public.users.email)
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              public.workflow_airline_profiles.airline_company_id = public.users.company_id::text
              or lower(public.workflow_airline_profiles.airline_email) = lower(public.users.email)
            )
          )
        )
    )
  );
create policy "gsas read own workflow profile" on public.workflow_gsa_profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'gsa'
            and (
              public.workflow_gsa_profiles.gsa_company_id = public.users.company_id::text
              or lower(public.workflow_gsa_profiles.gsa_email) = lower(public.users.email)
            )
          )
        )
    )
  );
create policy "gsas manage own workflow profile" on public.workflow_gsa_profiles
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'gsa'
            and (
              public.workflow_gsa_profiles.gsa_company_id = public.users.company_id::text
              or lower(public.workflow_gsa_profiles.gsa_email) = lower(public.users.email)
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'gsa'
            and (
              public.workflow_gsa_profiles.gsa_company_id = public.users.company_id::text
              or lower(public.workflow_gsa_profiles.gsa_email) = lower(public.users.email)
            )
          )
        )
    )
  );
create policy "workflow attachment parties read" on public.workflow_attachments
  for select to authenticated
  using (
    visibility = 'tender-public'
    or exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              public.workflow_attachments.airline_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.airline_email) = lower(public.users.email)
            )
          )
          or (
            role = 'gsa'
            and (
              public.workflow_attachments.gsa_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.gsa_email) = lower(public.users.email)
            )
          )
        )
    )
  );
create policy "workflow attachment parties manage" on public.workflow_attachments
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              public.workflow_attachments.airline_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.airline_email) = lower(public.users.email)
            )
          )
          or (
            role = 'gsa'
            and (
              public.workflow_attachments.gsa_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.gsa_email) = lower(public.users.email)
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              public.workflow_attachments.airline_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.airline_email) = lower(public.users.email)
            )
          )
          or (
            role = 'gsa'
            and (
              public.workflow_attachments.gsa_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.gsa_email) = lower(public.users.email)
            )
          )
        )
    )
  );
create policy "admins manage workflow email deliveries" on public.workflow_email_deliveries
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "users manage own workflow state" on public.workflow_user_state
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_user_state.session_key = public.users.role::text || ':' || coalesce(public.users.company_id::text, lower(public.users.email))
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_user_state.session_key = public.users.role::text || ':' || coalesce(public.users.company_id::text, lower(public.users.email))
        )
    )
  );
create policy "authenticated read profiles" on public.airline_profiles for select to authenticated using (true);
create policy "authenticated read gsa profiles" on public.gsa_profiles for select to authenticated using (true);
create policy "authenticated read open tenders" on public.tenders for select to authenticated using (status = 'open' or airline_company_id in (select company_id from public.users where id = auth.uid()));
create policy "authenticated read live tenders" on public.live_tenders
  for select to authenticated
  using (
    data->>'status' = 'open'
    or exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or data->>'airlineCompanyId' = company_id::text
          or lower(data->>'airlineEmail') = lower(email)
        )
    )
  );
create policy "authenticated read live applications" on public.live_applications
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or data->>'gsaCompanyId' = company_id::text
          or lower(data->>'email') = lower(email)
          or exists (
            select 1 from public.live_tenders
            where public.live_tenders.id = public.live_applications.tender_id
              and (
                public.live_tenders.data->>'airlineCompanyId' = public.users.company_id::text
                or lower(public.live_tenders.data->>'airlineEmail') = lower(public.users.email)
              )
          )
        )
    )
  );
create policy "airlines manage own live tenders" on public.live_tenders
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              data->>'airlineCompanyId' = company_id::text
              or lower(data->>'airlineEmail') = lower(email)
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              data->>'airlineCompanyId' = company_id::text
              or lower(data->>'airlineEmail') = lower(email)
            )
          )
        )
    )
  );
create policy "company manage visible live applications" on public.live_applications
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or data->>'gsaCompanyId' = company_id::text
          or lower(data->>'email') = lower(email)
          or exists (
            select 1 from public.live_tenders
            where public.live_tenders.id = public.live_applications.tender_id
              and (
                public.live_tenders.data->>'airlineCompanyId' = public.users.company_id::text
                or lower(public.live_tenders.data->>'airlineEmail') = lower(public.users.email)
              )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or data->>'gsaCompanyId' = company_id::text
          or lower(data->>'email') = lower(email)
          or exists (
            select 1 from public.live_tenders
            where public.live_tenders.id = public.live_applications.tender_id
              and (
                public.live_tenders.data->>'airlineCompanyId' = public.users.company_id::text
                or lower(public.live_tenders.data->>'airlineEmail') = lower(public.users.email)
              )
          )
        )
    )
  );
create policy "authenticated read live contracts" on public.live_partner_contracts
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or data->>'airlineCompanyId' = company_id::text
          or data->>'gsaCompanyId' = company_id::text
          or lower(data->>'airlineEmail') = lower(email)
          or lower(data->>'email') = lower(email)
        )
    )
  );
create policy "airlines manage own live contracts" on public.live_partner_contracts
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              data->>'airlineCompanyId' = company_id::text
              or lower(data->>'airlineEmail') = lower(email)
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              data->>'airlineCompanyId' = company_id::text
              or lower(data->>'airlineEmail') = lower(email)
            )
          )
        )
    )
  );
create policy "company read platform campaigns" on public.platform_campaigns
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.platform_campaigns.author_company_id = public.users.company_id::text
          or (
            role = 'gsa'
            and author_role = 'airline'
            and status = 'published'
            and (
              coalesce(public.platform_campaigns.data->'targetCompanyIds', '[]'::jsonb) = '[]'::jsonb
              or coalesce(public.platform_campaigns.data->'targetCompanyIds', '[]'::jsonb) ? public.users.company_id::text
            )
          )
        )
    )
  );
create policy "company manage own platform campaigns" on public.platform_campaigns
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (public.platform_campaigns.author_company_id = public.users.company_id::text and role::text = author_role)
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (public.platform_campaigns.author_company_id = public.users.company_id::text and role::text = author_role)
        )
    )
  );
create policy "company read capacity alerts" on public.capacity_alerts
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.capacity_alerts.airline_company_id = public.users.company_id::text
          or (
            role = 'gsa'
            and status = 'active'
            and (
              public.capacity_alerts.target_gsa_company_id = public.users.company_id::text
              or public.capacity_alerts.data->'routes' @> jsonb_build_array(jsonb_build_object('gsaCompanyId', public.users.company_id::text))
            )
          )
        )
    )
  );
create policy "airlines manage own capacity alerts" on public.capacity_alerts
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (role = 'airline' and public.capacity_alerts.airline_company_id = public.users.company_id::text)
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (role = 'airline' and public.capacity_alerts.airline_company_id = public.users.company_id::text)
        )
    )
  );
create policy "users read own profile" on public.users for select to authenticated using (id = auth.uid());
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "authenticated read news" on public.news_posts for select to authenticated using (true);
create policy "authenticated read linkedin sources" on public.linkedin_sources for select to authenticated using (true);
create policy "authenticated read workflow news" on public.workflow_news_posts for select to authenticated using (true);
create policy "authenticated read workflow linkedin sources" on public.workflow_linkedin_sources for select to authenticated using (true);
create policy "authenticated read airline fleet aircraft" on public.airline_fleet_aircraft for select to authenticated using (true);
create policy "admins manage airline fleet aircraft" on public.airline_fleet_aircraft
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "admins manage linkedin import configs" on public.linkedin_import_configs
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "company read contracts" on public.contracts
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "airlines manage own contracts" on public.contracts
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (role = 'airline' and public.contracts.airline_company_id = public.users.company_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (role = 'airline' and public.contracts.airline_company_id = public.users.company_id)
        )
    )
  );
create policy "company read contract routes" on public.contract_routes
  for select to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.contract_routes.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "airlines manage own contract routes" on public.contract_routes
  for all to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.contract_routes.contract_id
        and (
          public.users.role = 'admin'
          or (public.users.role = 'airline' and public.contracts.airline_company_id = public.users.company_id)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.contract_routes.contract_id
        and (
          public.users.role = 'admin'
          or (public.users.role = 'airline' and public.contracts.airline_company_id = public.users.company_id)
        )
    )
  );
create policy "company read mandate quotes" on public.mandate_quotes
  for select to authenticated
  using (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_quotes.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "contract parties manage mandate quotes" on public.mandate_quotes
  for all to authenticated
  using (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_quotes.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  )
  with check (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_quotes.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "company read mandate bookings" on public.mandate_bookings
  for select to authenticated
  using (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_bookings.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "contract parties manage mandate bookings" on public.mandate_bookings
  for all to authenticated
  using (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_bookings.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  )
  with check (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_bookings.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "company read control actions" on public.control_actions
  for select to authenticated
  using (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_actions.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "contract parties manage control actions" on public.control_actions
  for all to authenticated
  using (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_actions.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  )
  with check (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_actions.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "company read control action comments" on public.control_action_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_action_comments.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "contract parties manage control action comments" on public.control_action_comments
  for all to authenticated
  using (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_action_comments.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  )
  with check (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_action_comments.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "company read monthly contract reports" on public.monthly_contract_reports
  for select to authenticated
  using (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.monthly_contract_reports.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "contract parties manage monthly contract reports" on public.monthly_contract_reports
  for all to authenticated
  using (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.monthly_contract_reports.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  )
  with check (
    exists (
      select 1 from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.monthly_contract_reports.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );
create policy "company read mandate audit events" on public.mandate_audit_events
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or lower(public.mandate_audit_events.actor_email) = lower(email)
          or exists (
            select 1 from public.contracts
            where public.contracts.id = public.mandate_audit_events.contract_id
              and (
                public.contracts.airline_company_id = public.users.company_id
                or public.contracts.gsa_company_id = public.users.company_id
              )
          )
        )
    )
  );
create policy "contract parties create mandate audit events" on public.mandate_audit_events
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or lower(public.mandate_audit_events.actor_email) = lower(email)
          or exists (
            select 1 from public.contracts
            where public.contracts.id = public.mandate_audit_events.contract_id
              and (
                public.contracts.airline_company_id = public.users.company_id
                or public.contracts.gsa_company_id = public.users.company_id
              )
          )
        )
    )
  );
create policy "admins manage news" on public.news_posts
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "admins manage linkedin sources" on public.linkedin_sources
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "admins manage workflow news" on public.workflow_news_posts
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "admins manage workflow linkedin sources" on public.workflow_linkedin_sources
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "workflow contract parties read quotes" on public.workflow_mandate_quotes
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_mandate_quotes.airline_company_id = public.users.company_id::text
          or public.workflow_mandate_quotes.gsa_company_id = public.users.company_id::text
        )
    )
  );
create policy "workflow contract parties manage quotes" on public.workflow_mandate_quotes
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_mandate_quotes.airline_company_id = public.users.company_id::text
          or public.workflow_mandate_quotes.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_mandate_quotes.airline_company_id = public.users.company_id::text
          or public.workflow_mandate_quotes.gsa_company_id = public.users.company_id::text
        )
    )
  );
create policy "workflow contract parties read bookings" on public.workflow_mandate_bookings
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_mandate_bookings.airline_company_id = public.users.company_id::text
          or public.workflow_mandate_bookings.gsa_company_id = public.users.company_id::text
        )
    )
  );
create policy "workflow contract parties manage bookings" on public.workflow_mandate_bookings
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_mandate_bookings.airline_company_id = public.users.company_id::text
          or public.workflow_mandate_bookings.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_mandate_bookings.airline_company_id = public.users.company_id::text
          or public.workflow_mandate_bookings.gsa_company_id = public.users.company_id::text
        )
    )
  );
create policy "workflow contract parties read actions" on public.workflow_control_actions
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_control_actions.airline_company_id = public.users.company_id::text
          or public.workflow_control_actions.gsa_company_id = public.users.company_id::text
        )
    )
  );
create policy "workflow contract parties manage actions" on public.workflow_control_actions
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_control_actions.airline_company_id = public.users.company_id::text
          or public.workflow_control_actions.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_control_actions.airline_company_id = public.users.company_id::text
          or public.workflow_control_actions.gsa_company_id = public.users.company_id::text
        )
    )
  );
create policy "workflow contract parties read action comments" on public.workflow_control_action_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_control_action_comments.airline_company_id = public.users.company_id::text
          or public.workflow_control_action_comments.gsa_company_id = public.users.company_id::text
        )
    )
  );
create policy "workflow contract parties manage action comments" on public.workflow_control_action_comments
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_control_action_comments.airline_company_id = public.users.company_id::text
          or public.workflow_control_action_comments.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_control_action_comments.airline_company_id = public.users.company_id::text
          or public.workflow_control_action_comments.gsa_company_id = public.users.company_id::text
        )
    )
  );
create policy "workflow contract parties read monthly reports" on public.workflow_monthly_reports
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_monthly_reports.airline_company_id = public.users.company_id::text
          or public.workflow_monthly_reports.gsa_company_id = public.users.company_id::text
        )
    )
  );
create policy "workflow contract parties manage monthly reports" on public.workflow_monthly_reports
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_monthly_reports.airline_company_id = public.users.company_id::text
          or public.workflow_monthly_reports.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_monthly_reports.airline_company_id = public.users.company_id::text
          or public.workflow_monthly_reports.gsa_company_id = public.users.company_id::text
        )
    )
  );
create policy "workflow contract parties read audit events" on public.workflow_audit_events
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or lower(public.workflow_audit_events.actor_email) = lower(public.users.email)
          or exists (
            select 1 from public.live_partner_contracts
            where public.live_partner_contracts.id = public.workflow_audit_events.contract_id
              and (
                public.live_partner_contracts.data->>'airlineCompanyId' = public.users.company_id::text
                or public.live_partner_contracts.data->>'gsaCompanyId' = public.users.company_id::text
              )
          )
        )
    )
  );
create policy "workflow contract parties create audit events" on public.workflow_audit_events
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or lower(public.workflow_audit_events.actor_email) = lower(public.users.email)
          or exists (
            select 1 from public.live_partner_contracts
            where public.live_partner_contracts.id = public.workflow_audit_events.contract_id
              and (
                public.live_partner_contracts.data->>'airlineCompanyId' = public.users.company_id::text
                or public.live_partner_contracts.data->>'gsaCompanyId' = public.users.company_id::text
              )
          )
        )
    )
  );
create policy "workflow recipients read notifications" on public.workflow_notifications
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            public.workflow_notifications.recipient_role = public.users.role::text
            and (
              public.workflow_notifications.recipient_company_id = public.users.company_id::text
              or lower(public.workflow_notifications.recipient_email) = lower(public.users.email)
            )
          )
        )
    )
  );
create policy "workflow recipients manage notifications" on public.workflow_notifications
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            public.workflow_notifications.recipient_role = public.users.role::text
            and (
              public.workflow_notifications.recipient_company_id = public.users.company_id::text
              or lower(public.workflow_notifications.recipient_email) = lower(public.users.email)
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            public.workflow_notifications.recipient_role = public.users.role::text
            and (
              public.workflow_notifications.recipient_company_id = public.users.company_id::text
              or lower(public.workflow_notifications.recipient_email) = lower(public.users.email)
            )
          )
        )
    )
  );

insert into storage.buckets (id, name, public)
values ('contract-documents', 'contract-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('workflow-attachments', 'workflow-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "admins manage workflow attachment objects" on storage.objects;
create policy "admins manage workflow attachment objects" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'workflow-attachments'
    and exists (
      select 1 from public.users
      where id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    bucket_id = 'workflow-attachments'
    and exists (
      select 1 from public.users
      where id = auth.uid()
        and role = 'admin'
    )
  );

create table if not exists public.workflow_quote_rooms (
  id text primary key,
  public_token text not null unique,
  quote_id text not null unique,
  contract_id text not null,
  airline_company_id text,
  gsa_company_id text,
  customer_email text,
  status text not null check (status in ('open', 'accepted', 'rejected', 'closed')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_message_at timestamptz not null,
  data jsonb not null
);

create table if not exists public.workflow_quote_room_messages (
  id text primary key,
  room_id text not null references public.workflow_quote_rooms(id) on delete cascade,
  actor text not null check (actor in ('gsa', 'customer', 'system')),
  created_at timestamptz not null,
  data jsonb not null
);

create table if not exists public.workflow_quote_room_offers (
  id text primary key,
  room_id text not null references public.workflow_quote_rooms(id) on delete cascade,
  quote_id text not null,
  status text not null check (status in ('sent', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  data jsonb not null
);

create index if not exists workflow_quote_rooms_contract_idx on public.workflow_quote_rooms(contract_id, updated_at desc);
create index if not exists workflow_quote_rooms_companies_idx on public.workflow_quote_rooms(airline_company_id, gsa_company_id, updated_at desc);
create index if not exists workflow_quote_room_messages_room_idx on public.workflow_quote_room_messages(room_id, created_at desc);
create index if not exists workflow_quote_room_offers_room_idx on public.workflow_quote_room_offers(room_id, updated_at desc);

alter table public.workflow_quote_rooms enable row level security;
alter table public.workflow_quote_room_messages enable row level security;
alter table public.workflow_quote_room_offers enable row level security;

drop policy if exists "workflow contract parties read quote rooms" on public.workflow_quote_rooms;
create policy "workflow contract parties read quote rooms" on public.workflow_quote_rooms
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

drop policy if exists "workflow contract parties manage quote rooms" on public.workflow_quote_rooms;
create policy "workflow contract parties manage quote rooms" on public.workflow_quote_rooms
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

drop policy if exists "workflow contract parties read quote room messages" on public.workflow_quote_room_messages;
create policy "workflow contract parties read quote room messages" on public.workflow_quote_room_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_messages.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

drop policy if exists "workflow contract parties manage quote room messages" on public.workflow_quote_room_messages;
create policy "workflow contract parties manage quote room messages" on public.workflow_quote_room_messages
  for all to authenticated
  using (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_messages.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_messages.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

drop policy if exists "workflow contract parties read quote room offers" on public.workflow_quote_room_offers;
create policy "workflow contract parties read quote room offers" on public.workflow_quote_room_offers
  for select to authenticated
  using (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_offers.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

drop policy if exists "workflow contract parties manage quote room offers" on public.workflow_quote_room_offers;
create policy "workflow contract parties manage quote room offers" on public.workflow_quote_room_offers
  for all to authenticated
  using (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_offers.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_offers.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

create table if not exists public.workflow_company_integrations (
  id text primary key,
  provider text not null check (provider in ('ecargoware', 'cargowise')),
  role text not null check (role in ('gsa')),
  company_id text,
  company_key text not null,
  company text not null,
  enabled boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  unique (role, company_key, provider)
);

create index if not exists workflow_company_integrations_company_idx
  on public.workflow_company_integrations(role, company_key, provider);

create index if not exists workflow_company_integrations_enabled_idx
  on public.workflow_company_integrations(provider, enabled, updated_at desc);

alter table public.workflow_company_integrations enable row level security;

drop policy if exists "workflow company integrations gsa manage" on public.workflow_company_integrations;
create policy "workflow company integrations gsa manage"
  on public.workflow_company_integrations
  for all
  using (role = 'gsa')
  with check (role = 'gsa');
