-- Phase 8: daily request quota for the AI assistant (the `chat` Edge Function calls use_ai_quota()).
-- Keeps one user, or the whole app, from using up the free Gemini quota.

-- One row per user per day. RLS on with no policy: the app never reads or writes it directly,
-- only use_ai_quota() (security definer) does.
create table public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  n int not null,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;

-- Counts one request for the caller and returns true, or returns false when a limit is reached.
-- The limits are constants here, not parameters: a caller could otherwise pass bigger ones.
-- shortcut: the app-wide cap is checked before the per-user insert, so it can be passed by a few
-- requests under heavy concurrency; fine for a free-tier guard, tighten it if the app grows.
-- Check the app-wide number against Google's current free limit for the pinned model.
create function public.use_ai_quota() returns boolean
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
  if coalesce((select sum(n) from public.ai_usage where day = current_date), 0) >= v_app_limit then
    return false;
  end if;
  -- One atomic statement: the update only happens while the user is under the limit.
  insert into public.ai_usage as u (user_id, day, n)
    values (v_uid, current_date, 1)
    on conflict (user_id, day) do update set n = u.n + 1 where u.n < v_user_limit
    returning n into v_n;
  return v_n is not null;
end;
$$;

revoke execute on function public.use_ai_quota() from public, anon;
grant execute on function public.use_ai_quota() to authenticated;
