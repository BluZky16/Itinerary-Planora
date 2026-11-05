-- Phase 5 test: country_marks RLS, plus budget/currency checks. Run in the Supabase SQL editor after the
-- phase 5 migration. Shows one row "country_marks tests passed" on success; any failure raises an error.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@marks-test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@marks-test.local');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

insert into public.country_marks (country_code, status) values ('ID', 'visited'), ('JP', 'wishlist');

do $$
begin
  assert (select count(*) from public.country_marks) = 2, 'A should see own marks';
  assert (select user_id from public.country_marks where country_code = 'ID') = '00000000-0000-0000-0000-00000000000a',
    'user_id should default to the caller';

  -- the app saves with upsert: same country again must update the status, not fail or duplicate
  insert into public.country_marks (country_code, status) values ('ID', 'wishlist')
    on conflict (user_id, country_code) do update set status = excluded.status;
  assert (select status from public.country_marks where country_code = 'ID') = 'wishlist', 'upsert should switch status';
  assert (select count(*) from public.country_marks) = 2, 'upsert must not add a second row';

  -- budget and currency checks
  begin
    insert into public.trips (title, start_date, end_date, budget) values ('neg', '2026-12-01', '2026-12-02', -1);
    raise exception 'negative budget accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.trips (title, start_date, end_date, currency) values ('bad', '2026-12-01', '2026-12-02', 'usd');
    raise exception 'lowercase currency accepted';
  exception when check_violation then null;
  end;
  insert into public.trips (title, start_date, end_date, budget, currency)
    values ('ok', '2026-12-01', '2026-12-02', 1500.50, 'USD');
end $$;

-- user B sees and changes nothing of A's
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$
declare n int;
begin
  assert (select count(*) from public.country_marks) = 0, 'B must not see A marks';

  update public.country_marks set status = 'wishlist';
  get diagnostics n = row_count;
  assert n = 0, 'B must not update A marks';

  delete from public.country_marks;
  get diagnostics n = row_count;
  assert n = 0, 'B must not delete A marks';

  -- B upserting the same country creates B's own row and leaves A's alone
  insert into public.country_marks (country_code, status) values ('ID', 'visited')
    on conflict (user_id, country_code) do update set status = excluded.status;
  assert (select count(*) from public.country_marks) = 1, 'B sees only own row after upsert';
  assert (select status from public.country_marks where country_code = 'ID') = 'visited', 'B own row is visited';

  begin
    insert into public.country_marks (user_id, country_code, status)
      values ('00000000-0000-0000-0000-00000000000a', 'FR', 'visited');
    raise exception 'B created a mark for A';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
-- signed-out role: no policy applies (or no grant), so it must see nothing
set local role anon;
do $$
begin
  begin
    assert (select count(*) from public.country_marks) = 0, 'anon must not see marks';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;
select 'country_marks tests passed' as result;
