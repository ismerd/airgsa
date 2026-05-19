do $$
begin
  create type public.aircraft_fleet_status as enum ('in_air', 'parked', 'tracking');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.airline_fleet_aircraft (
  id uuid primary key default gen_random_uuid(),
  registration text not null unique,
  airline_icao text not null,
  airline_name text not null,
  aircraft_type text,
  aircraft_model text,
  status public.aircraft_fleet_status not null default 'tracking',
  current_fr24_id text,
  current_flight_number text,
  current_callsign text,
  origin_iata text,
  origin_icao text,
  destination_iata text,
  destination_icao text,
  parked_airport_iata text,
  parked_airport_icao text,
  parked_airport_name text,
  last_position_lat numeric(10,6),
  last_position_lng numeric(10,6),
  last_altitude integer,
  last_ground_speed integer,
  last_seen_live_at timestamptz,
  first_seen_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists airline_fleet_aircraft_airline_status_idx
  on public.airline_fleet_aircraft(airline_icao, status);

create index if not exists airline_fleet_aircraft_updated_idx
  on public.airline_fleet_aircraft(updated_at desc);

alter table public.airline_fleet_aircraft enable row level security;

drop policy if exists "authenticated read airline fleet aircraft" on public.airline_fleet_aircraft;
create policy "authenticated read airline fleet aircraft" on public.airline_fleet_aircraft
  for select to authenticated using (true);

drop policy if exists "admins manage airline fleet aircraft" on public.airline_fleet_aircraft;
create policy "admins manage airline fleet aircraft" on public.airline_fleet_aircraft
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );
