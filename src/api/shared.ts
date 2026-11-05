import type { ItemType } from '@/api/items';
import { supabase } from '@/lib/supabase';

// What the public share link shows: no budget, costs or notes (the database function leaves them out).
export type SharedItem = {
  type: ItemType;
  title: string;
  start_time: string | null;
  end_time: string | null;
  place_name: string | null;
  from_place: string | null;
  to_place: string | null;
};
export type SharedTrip = {
  title: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  days: { date: string; items: SharedItem[] }[];
};

// Works signed out. Returns null when the link is wrong or has been turned off.
export async function getSharedTrip(token: string): Promise<SharedTrip | null> {
  const { data, error } = await supabase.rpc('get_shared_trip', { p_token: token });
  if (error) throw error;
  return data as SharedTrip | null;
}
