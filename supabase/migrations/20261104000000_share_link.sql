-- Phase 6: read-only share link for one trip.
-- Anonymous users still have no table access; they can only call get_shared_trip with a valid token.

-- Owner turns sharing on (runs as the caller, so RLS means only the owner's trip is updated).
-- Calling it again returns the same token; revoking is "update trips set share_token = null".
create function public.share_trip(p_trip_id uuid) returns text
language plpgsql set search_path = '' as $$
declare
  v_token text;
begin
  -- gen_random_uuid() is a secure random value (122 bits), so the token cannot be guessed.
  update public.trips
    set share_token = coalesce(share_token, replace(gen_random_uuid()::text, '-', ''))
    where id = p_trip_id
    returning share_token into v_token;
  if v_token is null then
    raise exception 'Trip not found.';
  end if;
  return v_token;
end;
$$;

-- Public read. Security definer so it can read past RLS, but it only ever returns the one trip
-- whose token matches, and leaves out budget, costs and notes.
create function public.get_shared_trip(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', t.title,
    'destination', t.destination,
    'start_date', t.start_date,
    'end_date', t.end_date,
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', d.date,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'type', i.type, 'title', i.title,
            'start_time', i.start_time, 'end_time', i.end_time,
            'place_name', i.place_name, 'from_place', i.from_place, 'to_place', i.to_place
          ) order by i.position)
          from public.items i where i.day_id = d.id
        ), '[]'::jsonb)
      ) order by d.position)
      from public.days d where d.trip_id = t.id
    ), '[]'::jsonb)
  )
  from public.trips t
  where t.share_token = p_token;
$$;

-- New functions are executable by everyone by default; lock each one to who needs it.
revoke execute on function public.share_trip(uuid) from public, anon;
grant execute on function public.share_trip(uuid) to authenticated;
revoke execute on function public.get_shared_trip(text) from public;
grant execute on function public.get_shared_trip(text) to anon, authenticated;
