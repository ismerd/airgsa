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
