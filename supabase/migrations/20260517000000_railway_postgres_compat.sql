do $$
begin
  create role authenticated;
exception
  when duplicate_object then null;
  when insufficient_privilege then null;
end $$;

create schema if not exists auth;
create schema if not exists storage;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select null::uuid
$$;

create or replace function auth.email()
returns text
language sql
stable
as $$
  select null::text
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id) on delete cascade,
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  metadata jsonb
);

alter table storage.objects enable row level security;
