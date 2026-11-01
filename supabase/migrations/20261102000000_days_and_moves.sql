-- Phase 3: cap trip length, keep days in sync with trip dates, move items in one transaction.
-- Both functions run as the calling user (security invoker), so RLS still applies.

-- One row per day is created below, so an unbounded range must be impossible.
alter table public.trips add constraint trips_max_90_days check (end_date - start_date < 90);

-- Days always match the trip's dates. Days that would be removed must be empty.
create function public.sync_trip_days() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.days d
    where d.trip_id = new.id
      and (d.date < new.start_date or d.date > new.end_date)
      and exists (select 1 from public.items i where i.day_id = d.id)
  ) then
    raise exception 'Some days outside the new dates still have plans. Move or delete those items first.';
  end if;

  delete from public.days d
  where d.trip_id = new.id and (d.date < new.start_date or d.date > new.end_date);

  insert into public.days (trip_id, date, position)
  select new.id, g::date, g::date - new.start_date
  from generate_series(new.start_date, new.end_date, interval '1 day') g
  on conflict (trip_id, date) do nothing;

  update public.days set position = date - new.start_date where trip_id = new.id;
  return null;
end;
$$;

create trigger trips_sync_days
  after insert or update of start_date, end_date on public.trips
  for each row execute function public.sync_trip_days();

-- Days for trips created before this migration.
update public.trips set start_date = start_date;

-- Moves an item to p_index within p_day_id (same day or another day of the same trip)
-- and renumbers both days, so positions stay 0..n-1 without gaps.
create function public.move_item(p_item_id uuid, p_day_id uuid, p_index int) returns void
language plpgsql set search_path = '' as $$
declare
  v_old_day uuid;
begin
  select day_id into v_old_day from public.items where id = p_item_id for update;
  if not found then
    raise exception 'Item not found.';
  end if;

  if not exists (
    select 1 from public.days a join public.days b on b.trip_id = a.trip_id
    where a.id = v_old_day and b.id = p_day_id
  ) then
    raise exception 'An item can only move to a day of the same trip.';
  end if;

  update public.items set day_id = p_day_id where id = p_item_id;

  with r as (
    select id, row_number() over (order by position, created_at) - 1 as rn
    from public.items where day_id = v_old_day and id <> p_item_id
  )
  update public.items i set position = r.rn from r where i.id = r.id;

  with r as (
    select id, row_number() over (order by position, created_at) - 1 as rn
    from public.items where day_id = p_day_id and id <> p_item_id
  )
  update public.items i
  set position = case when r.rn < greatest(p_index, 0) then r.rn else r.rn + 1 end
  from r where i.id = r.id;

  update public.items
  set position = least(greatest(p_index, 0),
                       (select count(*) from public.items where day_id = p_day_id and id <> p_item_id))
  where id = p_item_id;
end;
$$;
