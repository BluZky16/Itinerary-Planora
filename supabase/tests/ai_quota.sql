-- Phase 8 test. Run in the Supabase SQL editor after 20261105000000_ai_quota.sql and
-- 20261105000001_ai_quota_followup.sql.
-- Checks the per-user and app-wide daily limits, that yesterday does not count, that old rows are purged,
-- that only the service role can refund, and that nobody can touch ai_usage directly, then rolls everything back.
-- Shows one row "ai_quota tests passed" on success; any failure raises an error.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@quota-test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@quota-test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@quota-test.local'),
  ('00000000-0000-0000-0000-00000000000d', 'd@quota-test.local');

-- user A: 20 requests pass, the 21st does not
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

do $$
declare i int;
begin
  for i in 1..20 loop
    assert public.use_ai_quota(), 'request ' || i || ' should pass';
  end loop;
  assert not public.use_ai_quota(), 'request 21 must be refused';
  assert not public.use_ai_quota(), 'request 22 must still be refused';

  -- no direct access to the usage table
  assert (select count(*) from public.ai_usage) = 0, 'A must not read ai_usage';
  begin
    insert into public.ai_usage (user_id, day, n)
      values ('00000000-0000-0000-0000-00000000000a', current_date + 1, 0);
    raise exception 'A wrote ai_usage';
  exception when insufficient_privilege then null;
  end;

  -- users cannot refund themselves
  begin
    perform public.refund_ai_quota('00000000-0000-0000-0000-00000000000a');
    raise exception 'A refunded';
  exception when insufficient_privilege then null;
  end;
end $$;

-- user B has a separate count
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  assert public.use_ai_quota(), 'B has its own count';
end $$;

-- the service role can refund B once, and the count never goes below 0
reset role;
set local role service_role;

do $$
begin
  perform public.refund_ai_quota('00000000-0000-0000-0000-00000000000b');
  assert (select n from public.ai_usage where user_id = '00000000-0000-0000-0000-00000000000b' and day = current_date) = 0,
    'refund gives one request back';
  perform public.refund_ai_quota('00000000-0000-0000-0000-00000000000b');
  assert (select n from public.ai_usage where user_id = '00000000-0000-0000-0000-00000000000b' and day = current_date) = 0,
    'refund never goes below 0';
end $$;

-- yesterday's usage does not count today, and rows older than a week are purged
reset role;
insert into public.ai_usage (user_id, day, n) values
  ('00000000-0000-0000-0000-00000000000d', current_date - 1, 20),
  ('00000000-0000-0000-0000-00000000000c', current_date - 10, 5);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  assert public.use_ai_quota(), 'yesterday must not count';
end $$;

reset role;
do $$
begin
  assert not exists (select 1 from public.ai_usage where day = current_date - 10), 'old rows must be purged';
  assert exists (select 1 from public.ai_usage where day = current_date - 1), 'recent rows must stay';
end $$;

-- app-wide cap: once today's total reaches 500, everyone is refused
insert into public.ai_usage (user_id, day, n)
  values ('00000000-0000-0000-0000-00000000000c', current_date, 500);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  assert not public.use_ai_quota(), 'app-wide cap must refuse B';
end $$;

-- signed out: no access
reset role;
set local role anon;

do $$
begin
  begin
    perform public.use_ai_quota();
    raise exception 'anon called use_ai_quota';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.refund_ai_quota('00000000-0000-0000-0000-00000000000b');
    raise exception 'anon refunded';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;
select 'ai_quota tests passed' as result;
