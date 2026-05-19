create table if not exists public.workflow_user_state (
  session_key text not null,
  key text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (session_key, key)
);

create index if not exists workflow_user_state_updated_idx
  on public.workflow_user_state(key, updated_at desc);

alter table public.workflow_user_state enable row level security;

drop policy if exists "users manage own workflow state" on public.workflow_user_state;
create policy "users manage own workflow state" on public.workflow_user_state
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_user_state.session_key = public.users.role::text || ':' || coalesce(public.users.company_id::text, lower(public.users.email))
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_user_state.session_key = public.users.role::text || ':' || coalesce(public.users.company_id::text, lower(public.users.email))
        )
    )
  );
