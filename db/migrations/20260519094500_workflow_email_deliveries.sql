create table if not exists public.workflow_email_deliveries (
  id text primary key,
  notification_id text not null,
  recipient_email text,
  recipient_company_id text,
  recipient_role text not null check (recipient_role in ('airline', 'gsa', 'admin')),
  provider text not null check (provider in ('resend', 'webhook', 'disabled', 'skipped')),
  status text not null check (status in ('sent', 'queued', 'skipped', 'failed')),
  status_code integer,
  error text,
  subject text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  data jsonb not null
);

create index if not exists workflow_email_deliveries_notification_idx on public.workflow_email_deliveries(notification_id, created_at desc);
create index if not exists workflow_email_deliveries_recipient_idx on public.workflow_email_deliveries(recipient_role, recipient_company_id, created_at desc);
create index if not exists workflow_email_deliveries_status_idx on public.workflow_email_deliveries(status, updated_at desc);

alter table public.workflow_email_deliveries enable row level security;

drop policy if exists "admins manage workflow email deliveries" on public.workflow_email_deliveries;
create policy "admins manage workflow email deliveries" on public.workflow_email_deliveries
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
