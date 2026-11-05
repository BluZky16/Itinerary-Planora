-- Phase 5: trip budget + currency, visited/wishlist countries.
-- All costs in a trip use the trip's currency, so the per-item currency goes away.

alter table public.trips
  add column budget numeric check (budget >= 0),
  add column currency text check (currency ~ '^[A-Z]{3}$');

alter table public.items drop column currency;

create table public.country_marks (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  status text not null check (status in ('visited', 'wishlist')),
  primary key (user_id, country_code)
);

alter table public.country_marks enable row level security;

create policy "own country marks" on public.country_marks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
