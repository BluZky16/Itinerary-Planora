import { supabase } from '@/lib/supabase';

export type Trip = {
  id: string;
  title: string;
  destination: string | null;
  start_date: string; // YYYY-MM-DD, trip-local
  end_date: string;
};

export type TripInput = Omit<Trip, 'id'>;

const COLUMNS = 'id, title, destination, start_date, end_date';

export async function listTrips(): Promise<Trip[]> {
  const { data, error } = await supabase.from('trips').select(COLUMNS).order('start_date');
  if (error) throw error;
  return data;
}

export async function getTrip(id: string): Promise<Trip> {
  const { data, error } = await supabase.from('trips').select(COLUMNS).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createTrip(input: TripInput): Promise<Trip> {
  const { data, error } = await supabase.from('trips').insert(input).select(COLUMNS).single();
  if (error) throw error;
  return data;
}

export async function updateTrip(id: string, input: TripInput): Promise<Trip> {
  const { data, error } = await supabase.from('trips').update(input).eq('id', id).select(COLUMNS).single();
  if (error) throw error;
  return data;
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}
