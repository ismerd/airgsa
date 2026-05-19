create table if not exists public.auth_password_reset_tokens (
  id text primary key,
  account_id text not null,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null,
  data jsonb not null
);

create index if not exists auth_password_reset_tokens_account_idx on public.auth_password_reset_tokens(account_id, created_at desc);
create index if not exists auth_password_reset_tokens_expires_idx on public.auth_password_reset_tokens(expires_at);

alter table public.auth_password_reset_tokens enable row level security;

drop policy if exists "admins manage auth password reset tokens" on public.auth_password_reset_tokens;
create policy "admins manage auth password reset tokens" on public.auth_password_reset_tokens
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

alter table public.workflow_email_deliveries
  drop constraint if exists workflow_email_deliveries_provider_check;

alter table public.workflow_email_deliveries
  add constraint workflow_email_deliveries_provider_check
  check (provider in ('resend', 'smtp', 'webhook', 'disabled', 'skipped'));
