import { supabase } from '@/lib/supabase';

export const ITEM_TYPES = ['attraction', 'lodging', 'restaurant', 'transport', 'other'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const TYPE_LABELS: Record<ItemType, string> = {
  attraction: 'Attraction',
  lodging: 'Lodging',
  restaurant: 'Restaurant',
  transport: 'Transport',
  other: 'Other',
};

export type Item = {
  id: string;
  day_id: string;
  position: number;
  type: ItemType;
  title: string;
  start_time: string | null; // HH:MM:SS from Postgres
  end_time: string | null;
  place_name: string | null;
  from_place: string | null; // transport only
  to_place: string | null;
  notes: string | null;
  cost: number | null;
};

export type ItemInput = Omit<Item, 'id' | 'day_id' | 'position'>;

export const ITEM_COLUMNS =
  'id, day_id, position, type, title, start_time, end_time, place_name, from_place, to_place, notes, cost';

export async function getItem(id: string): Promise<Item> {
  const { data, error } = await supabase.from('items').select(ITEM_COLUMNS).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createItem(dayId: string, position: number, input: ItemInput): Promise<void> {
  const { error } = await supabase.from('items').insert({ ...input, day_id: dayId, position });
  if (error) throw error;
}

export async function updateItem(id: string, input: ItemInput): Promise<void> {
  const { error } = await supabase.from('items').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}

// Moves within a day or to another day of the same trip; the database renumbers both days.
export async function moveItem(id: string, dayId: string, index: number): Promise<void> {
  const { error } = await supabase.rpc('move_item', { p_item_id: id, p_day_id: dayId, p_index: index });
  if (error) throw error;
}
