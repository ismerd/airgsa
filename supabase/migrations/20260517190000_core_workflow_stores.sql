create extension if not exists "pgcrypto";

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
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

create index if not exists live_tenders_status_idx on public.live_tenders(status);
create index if not exists live_applications_tender_idx on public.live_applications(tender_id);
create index if not exists live_applications_status_idx on public.live_applications(status);
create unique index if not exists live_applications_tender_gsa_idx on public.live_applications(tender_id, gsa_id);
create index if not exists live_partner_contracts_tender_idx on public.live_partner_contracts(tender_id);
create index if not exists live_partner_contracts_application_idx on public.live_partner_contracts(application_id);
create unique index if not exists live_partner_contracts_application_unique_idx on public.live_partner_contracts(application_id);
create index if not exists live_partner_contracts_airline_idx on public.live_partner_contracts(airline_email);
create index if not exists live_partner_contracts_status_idx on public.live_partner_contracts(status);

alter table public.app_settings enable row level security;
alter table public.live_tenders enable row level security;
alter table public.live_applications enable row level security;
alter table public.live_partner_contracts enable row level security;

drop policy if exists "admins manage app settings" on public.app_settings;
create policy "admins manage app settings" on public.app_settings
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

drop policy if exists "authenticated read live tenders" on public.live_tenders;
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

drop policy if exists "authenticated read live applications" on public.live_applications;
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
        )
    )
  );

drop policy if exists "authenticated read live contracts" on public.live_partner_contracts;
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
