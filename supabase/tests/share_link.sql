-- Phase 6 test. Run in the Supabase SQL editor after 20261104000000_share_link.sql.
-- Checks that only the owner can share, that the public function leaks nothing private,
-- and that revoking works, then rolls everything back.
-- Shows one row "share_link tests passed" on success; any failure raises an error.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@share-test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@share-test.local');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

insert into public.trips (id, title, start_date, end_date, budget, currency)
  values ('10000000-0000-0000-0000-000000000001', 'Shared trip', '2026-12-01', '2026-12-02', 999, 'USD');

do $$
declare
  d1 uuid;
  tok text;
  tok2 text;
  shared jsonb;
begin
  select id into d1 from public.days where date = '2026-12-01';
  insert into public.items (day_id, position, type, title, notes, cost)
    values (d1, 0, 'lodging', 'Hotel', 'secret booking code 123', 300);
  insert into public.items (day_id, position, type, title)
    values (d1, 1, 'other', 'Walk');

  tok := public.share_trip('10000000-0000-0000-0000-000000000001');
  assert length(tok) = 32, 'token should be 32 characters';
  tok2 := public.share_trip('10000000-0000-0000-0000-000000000001');
  assert tok = tok2, 'sharing again keeps the same token';
  perform set_config('test.token', tok, true);

  shared := public.get_shared_trip(tok);
  assert shared->>'title' = 'Shared trip', 'shared trip has the title';
  assert jsonb_array_length(shared->'days') = 2, 'shared trip has both days';
  assert shared->'days'->0->'items'->0->>'title' = 'Hotel', 'items keep their order';
  assert shared->'days'->0->'items'->1->>'title' = 'Walk', 'items keep their order (2)';
  assert shared::text not like '%secret booking code%', 'notes must not be shared';
  assert shared::text not like '%300%', 'costs must not be shared';
  assert shared::text not like '%999%', 'budget must not be shared';
end $$;

-- user B cannot share or revoke A's trip, and cannot read the token
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;

do $$
declare n int;
begin
  begin
    perform public.share_trip('10000000-0000-0000-0000-000000000001');
    raise exception 'B shared A trip';
  exception when raise_exception then
    if sqlerrm = 'B shared A trip' then raise; end if;
  end;

  update public.trips set share_token = null;
  get diagnostics n = row_count;
  assert n = 0, 'B must not revoke A link';
  assert (select count(*) from public.trips) = 0, 'B must not read A trips (and so not the token)';
end $$;

-- signed-out visitor: works with the token, nothing else
reset role;
set local role anon;

do $$
declare
  tok text := current_setting('test.token');
begin
  assert (select count(*) from public.trips) = 0, 'anon must not read trips';
  assert public.get_shared_trip(tok) is not null, 'anon can open a shared trip by token';
  assert public.get_shared_trip('not-a-real-token') is null, 'unknown token gives nothing';
  assert public.get_shared_trip(null) is null, 'null token gives nothing';

  begin
    perform public.share_trip('10000000-0000-0000-0000-000000000001');
    raise exception 'anon shared a trip';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A revokes: the old link stops working at once, a new share makes a new token
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  old_tok text := current_setting('test.token');
  new_tok text;
begin
  update public.trips set share_token = null where id = '10000000-0000-0000-0000-000000000001';
  assert public.get_shared_trip(old_tok) is null, 'revoked link must stop working';
  new_tok := public.share_trip('10000000-0000-0000-0000-000000000001');
  assert new_tok <> old_tok, 'sharing again after revoke gives a new token';
  assert public.get_shared_trip(old_tok) is null, 'old token stays dead';
  assert public.get_shared_trip(new_tok) is not null, 'new token works';
end $$;

reset role;
rollback;
select 'share_link tests passed' as result;
