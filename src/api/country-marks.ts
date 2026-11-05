import { supabase } from '@/lib/supabase';

export type MarkStatus = 'visited' | 'wishlist';
export type CountryMark = { country_code: string; status: MarkStatus };

export async function listCountryMarks(): Promise<CountryMark[]> {
  const { data, error } = await supabase.from('country_marks').select('country_code, status');
  if (error) throw error;
  return data as CountryMark[];
}

// status null removes the mark. user_id comes from the database default (the signed-in user).
export async function setCountryMark(code: string, status: MarkStatus | null): Promise<void> {
  const { error } = status
    ? await supabase.from('country_marks').upsert({ country_code: code, status })
    : await supabase.from('country_marks').delete().eq('country_code', code);
  if (error) throw error;
}
