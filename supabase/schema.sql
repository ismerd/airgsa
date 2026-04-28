create extension if not exists "pgcrypto";

create type public.user_role as enum ('airline', 'gsa', 'admin');
create type public.company_type as enum ('airline', 'gsa', 'platform');
create type public.tender_status as enum ('draft', 'open', 'closed');
create type public.application_status as enum ('pending', 'shortlisted', 'accepted', 'rejected');
create type public.contract_status as enum ('pending', 'active', 'closed');
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

create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null,
  source_url text,
  category public.news_category not null,
  market text,
  published_at timestamptz,
  summary text,
  confidence numeric(5,2) default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.linkedin_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  category public.news_category not null,
  status public.source_status not null default 'active',
  last_import_at timestamptz,
  created_at timestamptz not null default now()
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

create index tenders_status_deadline_idx on public.tenders(status, deadline);
create index tender_applications_tender_idx on public.tender_applications(tender_id);
create index kpi_reports_contract_period_idx on public.kpi_reports(contract_id, period_start);
create index news_posts_category_published_idx on public.news_posts(category, published_at desc);
create index notifications_user_status_idx on public.notifications(user_id, status);

alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.airline_profiles enable row level security;
alter table public.gsa_profiles enable row level security;
alter table public.tenders enable row level security;
alter table public.tender_applications enable row level security;
alter table public.contracts enable row level security;
alter table public.kpi_reports enable row level security;
alter table public.news_posts enable row level security;
alter table public.linkedin_sources enable row level security;
alter table public.notifications enable row level security;

create policy "authenticated read companies" on public.companies for select to authenticated using (true);
create policy "authenticated read profiles" on public.airline_profiles for select to authenticated using (true);
create policy "authenticated read gsa profiles" on public.gsa_profiles for select to authenticated using (true);
create policy "authenticated read open tenders" on public.tenders for select to authenticated using (status = 'open' or airline_company_id in (select company_id from public.users where id = auth.uid()));
create policy "users read own profile" on public.users for select to authenticated using (id = auth.uid());
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "authenticated read news" on public.news_posts for select to authenticated using (true);
create policy "authenticated read linkedin sources" on public.linkedin_sources for select to authenticated using (true);

insert into storage.buckets (id, name, public)
values ('contract-documents', 'contract-documents', false)
on conflict (id) do nothing;
