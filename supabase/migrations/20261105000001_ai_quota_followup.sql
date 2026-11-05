-- Phase 8 review fixes for the AI quota (see 20261105000000_ai_quota.sql).

-- The app-wide check filters by day alone, which the (user_id, day) primary key cannot serve.
create index ai_usage_day_idx on public.ai_usage (day);

-- Same function as before, plus: rows older than a week are deleted, so the table does not grow forever.
create or replace function public.use_ai_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user_limit constant int := 20;
  v_app_limit constant int := 500;
  v_uid uuid := auth.uid();
  v_n int;
begin
  if v_uid is null then
    return false;
  end if;
  delete from public.ai_usage where day < current_date - 7;
  if coalesce((select sum(n) from public.ai_usage where day = current_date), 0) >= v_app_limit then
    return false;
  end if;
  insert into public.ai_usage as u (user_id, day, n)
    values (v_uid, current_date, 1)
    on conflict (user_id, day) do update set n = u.n + 1 where u.n < v_user_limit
    returning n into v_n;
  return v_n is not null;
end;
$$;

-- Gives one request back when Gemini failed. Only the Edge Function may call it (with the service role):
-- if users could, they would refund themselves past the limit.
create function public.refund_ai_quota(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  update public.ai_usage set n = greatest(n - 1, 0) where user_id = p_user and day = current_date;
$$;

revoke execute on function public.refund_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.refund_ai_quota(uuid) to service_role;
