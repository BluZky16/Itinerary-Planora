-- Phase 1 schema: profiles, trips, days, items. RLS on every table.
-- Share link access (get_shared_trip) is added in phase 6.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  title text not null,
  destination text,
  start_date date not null,
  end_date date not null,
  share_token text unique,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  position int not null,
  unique (trip_id, date)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days (id) on delete cascade,
  position int not null,
  type text not null check (type in ('attraction', 'lodging', 'restaurant', 'transport', 'other')),
  title text not null,
  start_time time,
  end_time time,
  place_id text,
  place_name text,
  lat double precision,
  lng double precision,
  from_place text,   -- transport only
  to_place text,     -- transport only
  notes text,
  cost numeric,
  currency text,
  created_at timestamptz not null default now()
);

create index days_trip_id_idx on public.days (trip_id);
create index items_day_id_idx on public.items (day_id);
create index trips_owner_id_idx on public.trips (owner_id);

-- A profile row is created for every new auth user.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.days enable row level security;
alter table public.items enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "own trips" on public.trips
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "days of own trips" on public.days
  for all to authenticated
  using (exists (
    select 1 from public.trips t where t.id = days.trip_id and t.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.trips t where t.id = days.trip_id and t.owner_id = (select auth.uid())
  ));

create policy "items of own trips" on public.items
  for all to authenticated
  using (exists (
    select 1 from public.days d join public.trips t on t.id = d.trip_id
    where d.id = items.day_id and t.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.days d join public.trips t on t.id = d.trip_id
    where d.id = items.day_id and t.owner_id = (select auth.uid())
  ));
