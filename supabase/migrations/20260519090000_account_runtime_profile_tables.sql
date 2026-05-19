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

alter table public.team_accounts add column if not exists auth_user_id text;
alter table public.team_accounts add column if not exists invited_at timestamptz;
alter table public.team_accounts add column if not exists last_invite_error text;

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

create index if not exists team_accounts_company_idx on public.team_accounts(role, company_id, company);
create index if not exists team_accounts_status_idx on public.team_accounts(status, updated_at desc);
create index if not exists team_accounts_auth_user_idx on public.team_accounts(auth_user_id);
create index if not exists workflow_airline_profiles_email_idx on public.workflow_airline_profiles(lower(airline_email));

alter table public.team_accounts enable row level security;
alter table public.fr24_runtime_settings enable row level security;
alter table public.workflow_airline_profiles enable row level security;

drop policy if exists "company managers read team accounts" on public.team_accounts;
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

drop policy if exists "company managers manage team accounts" on public.team_accounts;
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

drop policy if exists "authenticated read fr24 runtime settings" on public.fr24_runtime_settings;
create policy "authenticated read fr24 runtime settings" on public.fr24_runtime_settings
  for select to authenticated using (true);

drop policy if exists "admins manage fr24 runtime settings" on public.fr24_runtime_settings;
create policy "admins manage fr24 runtime settings" on public.fr24_runtime_settings
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

drop policy if exists "airlines read own workflow profile" on public.workflow_airline_profiles;
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

drop policy if exists "airlines manage own workflow profile" on public.workflow_airline_profiles;
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
