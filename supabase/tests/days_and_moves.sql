-- Phase 3 test. Run in the Supabase SQL editor after 20261102000000_days_and_moves.sql.
-- Checks day sync, the 90-day cap and move_item, then rolls everything back.
-- Shows one row "days_and_moves tests passed" on success; any failure raises an error.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@rls-test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@rls-test.local');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

insert into public.trips (id, title, start_date, end_date)
  values ('10000000-0000-0000-0000-000000000001', 'A trip', '2026-12-01', '2026-12-03');

do $$
declare
  d1 uuid; d2 uuid; d3 uuid;
  i1 uuid; i2 uuid; i3 uuid;
  order_d1 text;
begin
  -- days created on insert, positions 0..2
  assert (select count(*) from public.days) = 3, 'insert creates 3 days';
  assert (select string_agg(position::text, ',' order by date) from public.days) = '0,1,2', 'day positions 0,1,2';

  select id into d1 from public.days where date = '2026-12-01';
  select id into d2 from public.days where date = '2026-12-02';
  select id into d3 from public.days where date = '2026-12-03';

  insert into public.items (day_id, position, type, title) values (d1, 0, 'other', 'one') returning id into i1;
  insert into public.items (day_id, position, type, title) values (d1, 1, 'other', 'two') returning id into i2;
  insert into public.items (day_id, position, type, title) values (d1, 2, 'other', 'three') returning id into i3;
  perform set_config('test.a_item', i1::text, true);
  perform set_config('test.a_day', d1::text, true);

  -- move down within a day: one,two,three -> two,one,three
  perform public.move_item(i1, d1, 1);
  select string_agg(title, ',' order by position) into order_d1 from public.items where day_id = d1;
  assert order_d1 = 'two,one,three', 'move down gives two,one,three, got ' || order_d1;

  -- move up to the top: three to index 0 -> three,two,one
  perform public.move_item(i3, d1, 0);
  select string_agg(title, ',' order by position) into order_d1 from public.items where day_id = d1;
  assert order_d1 = 'three,two,one', 'move up gives three,two,one, got ' || order_d1;

  -- move to another day: old day renumbered with no gap
  perform public.move_item(i2, d3, 99);
  assert (select string_agg(title || position, ',' order by position) from public.items where day_id = d1) = 'three0,one1',
    'old day renumbered to 0,1';
  assert (select position from public.items where id = i2) = 0, 'moved item is first in empty day';

  -- shrinking dates over a day with items is refused
  begin
    update public.trips set end_date = '2026-12-02' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'shrink over a non-empty day was allowed';
  exception when raise_exception then
    if sqlerrm = 'shrink over a non-empty day was allowed' then raise; end if;
  end;

  -- shrinking over empty days works; moving start shifts positions
  delete from public.items where id = i2;
  update public.trips set start_date = '2026-11-30', end_date = '2026-12-02'
    where id = '10000000-0000-0000-0000-000000000001';
  assert (select string_agg(date::text || '=' || position, ',' order by date) from public.days)
    = '2026-11-30=0,2026-12-01=1,2026-12-02=2', 'days follow new dates';
  assert (select count(*) from public.items where day_id = d1) = 2, 'items on kept days survive';

  -- 90-day cap
  begin
    update public.trips set end_date = '2027-03-01' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'trip longer than 90 days was allowed';
  exception when check_violation then null;
  end;
end $$;

-- user B cannot move A's item
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  begin
    perform public.move_item(current_setting('test.a_item')::uuid, current_setting('test.a_day')::uuid, 0);
    raise exception 'B moved an item';
  exception when raise_exception then
    if sqlerrm = 'B moved an item' then raise; end if;
  end;
end $$;

reset role;
rollback;
select 'days_and_moves tests passed' as result;  -- only reached if every assert above held
