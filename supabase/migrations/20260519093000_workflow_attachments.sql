create table if not exists public.workflow_attachments (
  id text primary key,
  contract_id text,
  entity_id text,
  entity_type text not null,
  airline_company_id text,
  airline_email text,
  gsa_company_id text,
  gsa_email text,
  visibility text not null default 'application',
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null default 0,
  storage text not null check (storage in ('supabase', 'file')),
  storage_path text not null,
  created_at timestamptz not null,
  data jsonb not null
);

create index if not exists workflow_attachments_contract_idx on public.workflow_attachments(contract_id, created_at desc);
create index if not exists workflow_attachments_entity_idx on public.workflow_attachments(entity_type, entity_id, created_at desc);
create index if not exists workflow_attachments_airline_idx on public.workflow_attachments(airline_company_id, created_at desc);
create index if not exists workflow_attachments_gsa_idx on public.workflow_attachments(gsa_company_id, created_at desc);

alter table public.workflow_attachments enable row level security;

drop policy if exists "workflow attachment parties read" on public.workflow_attachments;
create policy "workflow attachment parties read" on public.workflow_attachments
  for select to authenticated
  using (
    visibility = 'tender-public'
    or exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              public.workflow_attachments.airline_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.airline_email) = lower(public.users.email)
            )
          )
          or (
            role = 'gsa'
            and (
              public.workflow_attachments.gsa_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.gsa_email) = lower(public.users.email)
            )
          )
        )
    )
  );

drop policy if exists "workflow attachment parties manage" on public.workflow_attachments;
create policy "workflow attachment parties manage" on public.workflow_attachments
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
              public.workflow_attachments.airline_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.airline_email) = lower(public.users.email)
            )
          )
          or (
            role = 'gsa'
            and (
              public.workflow_attachments.gsa_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.gsa_email) = lower(public.users.email)
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
              public.workflow_attachments.airline_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.airline_email) = lower(public.users.email)
            )
          )
          or (
            role = 'gsa'
            and (
              public.workflow_attachments.gsa_company_id = public.users.company_id::text
              or lower(public.workflow_attachments.gsa_email) = lower(public.users.email)
            )
          )
        )
    )
  );
