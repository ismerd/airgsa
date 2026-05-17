create table if not exists public.mandate_execution_events (
  id text primary key,
  entity_type text not null,
  entity_id text not null,
  actor_email text,
  actor_role text,
  company_id text,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_campaigns (
  id text primary key,
  author_role text not null check (author_role in ('airline', 'gsa')),
  author_company_id text,
  status text not null check (status in ('draft', 'published', 'scheduled', 'archived')),
  data jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.capacity_alerts (
  id text primary key,
  airline_company_id text,
  target_gsa_company_id text,
  status text not null check (status in ('active', 'filled', 'recalled')),
  urgency text not null check (urgency in ('normal', 'urgent', 'critical')),
  data jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists mandate_execution_events_entity_idx on public.mandate_execution_events(entity_type, entity_id);
create index if not exists mandate_execution_events_company_idx on public.mandate_execution_events(company_id, created_at desc);
create index if not exists platform_campaigns_author_idx on public.platform_campaigns(author_role, author_company_id, updated_at desc);
create index if not exists platform_campaigns_status_idx on public.platform_campaigns(status, updated_at desc);
create index if not exists capacity_alerts_airline_idx on public.capacity_alerts(airline_company_id, created_at desc);
create index if not exists capacity_alerts_gsa_idx on public.capacity_alerts(target_gsa_company_id, created_at desc);
create index if not exists capacity_alerts_status_idx on public.capacity_alerts(status, created_at desc);

alter table public.mandate_execution_events enable row level security;
alter table public.platform_campaigns enable row level security;
alter table public.capacity_alerts enable row level security;

drop policy if exists "company read mandate execution events" on public.mandate_execution_events;
create policy "company read mandate execution events" on public.mandate_execution_events
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.mandate_execution_events.company_id = public.users.company_id::text
          or lower(actor_email) = lower(email)
        )
    )
  );

drop policy if exists "company read platform campaigns" on public.platform_campaigns;
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
          )
        )
    )
  );

drop policy if exists "company manage own platform campaigns" on public.platform_campaigns;
create policy "company manage own platform campaigns" on public.platform_campaigns
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            public.platform_campaigns.author_company_id = public.users.company_id::text
            and role::text = author_role
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
            public.platform_campaigns.author_company_id = public.users.company_id::text
            and role::text = author_role
          )
        )
    )
  );

drop policy if exists "company read capacity alerts" on public.capacity_alerts;
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
              or public.capacity_alerts.data::text like '%' || public.users.company_id::text || '%'
            )
          )
        )
    )
  );

drop policy if exists "airlines manage own capacity alerts" on public.capacity_alerts;
create policy "airlines manage own capacity alerts" on public.capacity_alerts
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and public.capacity_alerts.airline_company_id = public.users.company_id::text
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
            and public.capacity_alerts.airline_company_id = public.users.company_id::text
          )
        )
    )
  );
