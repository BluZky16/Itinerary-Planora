-- RLS test. Run in the Supabase SQL editor after the migration.
-- Creates two fake users, proves user B cannot see or change user A's data,
-- then rolls everything back. Shows one row "RLS tests passed" on success; any failure raises an error.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@rls-test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@rls-test.local');

-- user A creates a trip, day and item
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

insert into public.trips (id, title, start_date, end_date)
  values ('10000000-0000-0000-0000-000000000001', 'A trip', '2026-12-01', '2026-12-03');
-- the trips_sync_days trigger created the 3 days; give the first one a known id
update public.days set id = '20000000-0000-0000-0000-000000000001' where date = '2026-12-01';
insert into public.items (day_id, position, type, title)
  values ('20000000-0000-0000-0000-000000000001', 0, 'other', 'A item');

do $$
begin
  assert (select count(*) from public.trips) = 1, 'A should see own trip';
  assert (select count(*) from public.days) = 3, 'A should see own days';
  assert (select count(*) from public.items) = 1, 'A should see own item';
end $$;

-- user B sees and changes nothing of A's
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$
declare n int;
begin
  assert (select count(*) from public.trips) = 0, 'B must not see A trips';
  assert (select count(*) from public.days) = 0, 'B must not see A days';
  assert (select count(*) from public.items) = 0, 'B must not see A items';

  update public.trips set title = 'hacked';
  get diagnostics n = row_count;
  assert n = 0, 'B must not update A trips';

  delete from public.items;
  get diagnostics n = row_count;
  assert n = 0, 'B must not delete A items';

  begin
    insert into public.days (trip_id, date, position)
      values ('10000000-0000-0000-0000-000000000001', '2026-12-10', 9);
    raise exception 'B inserted a day into A trip';
  exception when insufficient_privilege then null;  -- expected: RLS violation
  end;

  begin
    insert into public.items (day_id, position, type, title)
      values ('20000000-0000-0000-0000-000000000001', 1, 'other', 'planted');
    raise exception 'B inserted an item into A day';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.trips (owner_id, title, start_date, end_date)
      values ('00000000-0000-0000-0000-00000000000a', 'forged', '2026-12-01', '2026-12-02');
    raise exception 'B created a trip owned by A';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;
select 'RLS tests passed' as result;  -- only reached if every assert above held
