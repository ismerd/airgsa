create extension if not exists "pgcrypto";

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
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
create index news_posts_category_published_idx on public.news_posts(category, published_at desc);
create index news_posts_external_id_idx on public.news_posts(external_id);
create index notifications_user_status_idx on public.notifications(user_id, status);
create index airline_fleet_aircraft_airline_status_idx on public.airline_fleet_aircraft(airline_icao, status);
create index airline_fleet_aircraft_updated_idx on public.airline_fleet_aircraft(updated_at desc);

alter table public.users enable row level security;
alter table public.app_settings enable row level security;
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
alter table public.linkedin_import_configs enable row level security;
alter table public.notifications enable row level security;
alter table public.airline_fleet_aircraft enable row level security;

create policy "authenticated read companies" on public.companies for select to authenticated using (true);
create policy "admins manage app settings" on public.app_settings
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
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

insert into storage.buckets (id, name, public)
values ('contract-documents', 'contract-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('workflow-attachments', 'workflow-attachments', false)
on conflict (id) do nothing;
