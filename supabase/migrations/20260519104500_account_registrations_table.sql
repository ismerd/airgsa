create table if not exists public.account_registrations (
  id text primary key,
  email text not null unique,
  role text not null check (role in ('airline', 'gsa')),
  company text not null,
  country text not null,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null,
  reviewed_at timestamptz,
  data jsonb not null
);

create index if not exists account_registrations_status_idx on public.account_registrations(status, submitted_at desc);
create index if not exists account_registrations_role_idx on public.account_registrations(role, submitted_at desc);

insert into public.account_registrations
  (id, email, role, company, country, status, submitted_at, reviewed_at, data)
select
  item->>'id',
  lower(item->>'email'),
  item->>'role',
  item->>'company',
  item->>'country',
  coalesce(item->>'status', 'pending'),
  coalesce(item->>'submittedAt', now()::text)::timestamptz,
  nullif(item->>'reviewedAt', '')::timestamptz,
  item
from public.app_settings settings
cross join lateral jsonb_array_elements(settings.value) item
where settings.key = 'registrations'
  and item ? 'id'
  and item ? 'email'
on conflict (email) do nothing;

alter table public.account_registrations enable row level security;

drop policy if exists "admins manage account registrations" on public.account_registrations;
create policy "admins manage account registrations" on public.account_registrations
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
