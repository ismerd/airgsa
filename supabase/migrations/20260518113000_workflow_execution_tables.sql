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

alter table public.workflow_mandate_quotes enable row level security;
alter table public.workflow_mandate_bookings enable row level security;
alter table public.workflow_control_actions enable row level security;
alter table public.workflow_control_action_comments enable row level security;
alter table public.workflow_monthly_reports enable row level security;
alter table public.workflow_audit_events enable row level security;
alter table public.workflow_notifications enable row level security;

drop policy if exists "workflow contract parties read quotes" on public.workflow_mandate_quotes;
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

drop policy if exists "workflow contract parties manage quotes" on public.workflow_mandate_quotes;
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

drop policy if exists "workflow contract parties read bookings" on public.workflow_mandate_bookings;
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

drop policy if exists "workflow contract parties manage bookings" on public.workflow_mandate_bookings;
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

drop policy if exists "workflow contract parties read actions" on public.workflow_control_actions;
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

drop policy if exists "workflow contract parties manage actions" on public.workflow_control_actions;
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

drop policy if exists "workflow contract parties read action comments" on public.workflow_control_action_comments;
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

drop policy if exists "workflow contract parties manage action comments" on public.workflow_control_action_comments;
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

drop policy if exists "workflow contract parties read monthly reports" on public.workflow_monthly_reports;
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

drop policy if exists "workflow contract parties manage monthly reports" on public.workflow_monthly_reports;
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

drop policy if exists "workflow contract parties read audit events" on public.workflow_audit_events;
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

drop policy if exists "workflow contract parties create audit events" on public.workflow_audit_events;
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

drop policy if exists "workflow recipients read notifications" on public.workflow_notifications;
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

drop policy if exists "workflow recipients manage notifications" on public.workflow_notifications;
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
