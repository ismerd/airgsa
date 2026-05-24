create table if not exists public.workflow_quote_rooms (
  id text primary key,
  public_token text not null unique,
  quote_id text not null unique,
  contract_id text not null,
  airline_company_id text,
  gsa_company_id text,
  customer_email text,
  status text not null check (status in ('open', 'accepted', 'rejected', 'closed')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_message_at timestamptz not null,
  data jsonb not null
);

create table if not exists public.workflow_quote_room_messages (
  id text primary key,
  room_id text not null references public.workflow_quote_rooms(id) on delete cascade,
  actor text not null check (actor in ('gsa', 'customer', 'system')),
  created_at timestamptz not null,
  data jsonb not null
);

create table if not exists public.workflow_quote_room_offers (
  id text primary key,
  room_id text not null references public.workflow_quote_rooms(id) on delete cascade,
  quote_id text not null,
  status text not null check (status in ('sent', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  data jsonb not null
);

create index if not exists workflow_quote_rooms_contract_idx on public.workflow_quote_rooms(contract_id, updated_at desc);
create index if not exists workflow_quote_rooms_companies_idx on public.workflow_quote_rooms(airline_company_id, gsa_company_id, updated_at desc);
create index if not exists workflow_quote_room_messages_room_idx on public.workflow_quote_room_messages(room_id, created_at desc);
create index if not exists workflow_quote_room_offers_room_idx on public.workflow_quote_room_offers(room_id, updated_at desc);

alter table public.workflow_quote_rooms enable row level security;
alter table public.workflow_quote_room_messages enable row level security;
alter table public.workflow_quote_room_offers enable row level security;

drop policy if exists "workflow contract parties read quote rooms" on public.workflow_quote_rooms;
create policy "workflow contract parties read quote rooms" on public.workflow_quote_rooms
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

drop policy if exists "workflow contract parties manage quote rooms" on public.workflow_quote_rooms;
create policy "workflow contract parties manage quote rooms" on public.workflow_quote_rooms
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

drop policy if exists "workflow contract parties read quote room messages" on public.workflow_quote_room_messages;
create policy "workflow contract parties read quote room messages" on public.workflow_quote_room_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_messages.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

drop policy if exists "workflow contract parties manage quote room messages" on public.workflow_quote_room_messages;
create policy "workflow contract parties manage quote room messages" on public.workflow_quote_room_messages
  for all to authenticated
  using (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_messages.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_messages.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

drop policy if exists "workflow contract parties read quote room offers" on public.workflow_quote_room_offers;
create policy "workflow contract parties read quote room offers" on public.workflow_quote_room_offers
  for select to authenticated
  using (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_offers.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );

drop policy if exists "workflow contract parties manage quote room offers" on public.workflow_quote_room_offers;
create policy "workflow contract parties manage quote room offers" on public.workflow_quote_room_offers
  for all to authenticated
  using (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_offers.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  )
  with check (
    exists (
      select 1
      from public.workflow_quote_rooms
      join public.users on public.users.id = auth.uid()
      where public.workflow_quote_rooms.id = public.workflow_quote_room_offers.room_id
        and (
          public.users.role = 'admin'
          or public.workflow_quote_rooms.airline_company_id = public.users.company_id::text
          or public.workflow_quote_rooms.gsa_company_id = public.users.company_id::text
        )
    )
  );
