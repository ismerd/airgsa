create table if not exists public.workflow_news_posts (
  id text primary key,
  title text not null,
  source text not null,
  category text,
  market text,
  published_at timestamptz,
  summary text,
  confidence numeric(5,2) default 0,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_linkedin_sources (
  id text primary key,
  name text not null,
  url text not null unique,
  category text,
  status text not null check (status in ('active', 'paused')),
  last_import_at timestamptz,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_news_posts_published_idx on public.workflow_news_posts(published_at desc);
create index if not exists workflow_news_posts_category_idx on public.workflow_news_posts(category, published_at desc);
create index if not exists workflow_linkedin_sources_status_idx on public.workflow_linkedin_sources(status, updated_at desc);

alter table public.workflow_news_posts enable row level security;
alter table public.workflow_linkedin_sources enable row level security;

drop policy if exists "authenticated read workflow news" on public.workflow_news_posts;
create policy "authenticated read workflow news" on public.workflow_news_posts
  for select to authenticated using (true);

drop policy if exists "admins manage workflow news" on public.workflow_news_posts;
create policy "admins manage workflow news" on public.workflow_news_posts
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

drop policy if exists "authenticated read workflow linkedin sources" on public.workflow_linkedin_sources;
create policy "authenticated read workflow linkedin sources" on public.workflow_linkedin_sources
  for select to authenticated using (true);

drop policy if exists "admins manage workflow linkedin sources" on public.workflow_linkedin_sources;
create policy "admins manage workflow linkedin sources" on public.workflow_linkedin_sources
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
