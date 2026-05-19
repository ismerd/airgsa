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

create index if not exists auth_accounts_role_company_idx on public.auth_accounts(role, company_id, company);
create index if not exists auth_accounts_status_idx on public.auth_accounts(status, updated_at desc);

alter table public.auth_accounts enable row level security;

drop policy if exists "admins manage auth accounts" on public.auth_accounts;
create policy "admins manage auth accounts" on public.auth_accounts
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

drop policy if exists "users read own auth account" on public.auth_accounts;
create policy "users read own auth account" on public.auth_accounts
  for select to authenticated
  using (id = auth.uid()::text or lower(email) = lower(coalesce(auth.email(), '')));
