import { ITEM_COLUMNS, type Item, type ItemType } from '@/api/items';
import { supabase } from '@/lib/supabase';

export type Trip = {
  id: string;
  title: string;
  destination: string | null;
  start_date: string; // YYYY-MM-DD, trip-local
  end_date: string;
  budget: number | null;
  currency: string | null; // 3-letter code; applies to the budget and every item cost in the trip
};

export type TripInput = Omit<Trip, 'id'>;

const COLUMNS = 'id, title, destination, start_date, end_date, budget, currency';

// Every trip with just the item types and costs, for the Budget and Dashboard screens.
export type TripCosts = Trip & { days: { items: { type: ItemType; cost: number | null }[] }[] };

export async function listTripCosts(): Promise<TripCosts[]> {
  const { data, error } = await supabase.from('trips').select(`${COLUMNS}, days(items(type, cost))`).order('start_date');
  if (error) throw error;
  return data as TripCosts[];
}

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

export type Day = { id: string; date: string; items: Item[] };
export type TripPlan = Trip & { days: Day[] };

// Trip with its days (created by the database from the trip dates) and their items, in order.
export async function getTripPlan(id: string): Promise<TripPlan> {
  const { data, error } = await supabase
    .from('trips')
    .select(`${COLUMNS}, days(id, date, items(${ITEM_COLUMNS}))`)
    .eq('id', id)
    .order('date', { referencedTable: 'days' })
    .order('position', { referencedTable: 'days.items' })
    .single();
  if (error) throw error;
  return data as TripPlan;
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
