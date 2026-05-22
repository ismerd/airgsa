create table if not exists public.workflow_gsa_profiles (
  tenant_key text primary key,
  gsa_company_id text,
  gsa_email text,
  logo_path text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists workflow_gsa_profiles_email_idx on public.workflow_gsa_profiles(lower(gsa_email));

alter table public.workflow_gsa_profiles enable row level security;

drop policy if exists "gsas read own workflow profile" on public.workflow_gsa_profiles;
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

drop policy if exists "gsas manage own workflow profile" on public.workflow_gsa_profiles;
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
