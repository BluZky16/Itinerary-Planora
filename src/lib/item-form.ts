import type { ItemInput, ItemType } from '@/api/items';

export type ItemFormValues = {
  type: ItemType;
  title: string;
  start_time: string;
  end_time: string;
  place_name: string;
  from_place: string;
  to_place: string;
  notes: string;
  cost: string;
};
export type ItemFormErrors = Partial<Record<keyof ItemFormValues, string>>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const COST = /^\d+(\.\d{1,2})?$/;
const orNull = (s: string) => s.trim() || null;

// Returns either errors to show, or the input to save. Fields that don't apply to the type are cleared.
export function parseItemForm(v: ItemFormValues): { errors: ItemFormErrors } | { input: ItemInput } {
  const errors: ItemFormErrors = {};
  const title = v.title.trim();
  const start = v.start_time.trim();
  const end = v.end_time.trim();
  const cost = v.cost.trim().replace(/[\s,]/g, ''); // allow "150,000" and "150 000"

  if (!title) errors.title = 'Title is required.';
  if (start && !TIME.test(start)) errors.start_time = 'Use HH:MM, for example 09:30.';
  if (end && !TIME.test(end)) errors.end_time = 'Use HH:MM, for example 17:00.';
  if (cost && !COST.test(cost)) errors.cost = 'Use a number, for example 150000 or 12.50.';

  if (Object.keys(errors).length) return { errors };

  const transport = v.type === 'transport';
  return {
    input: {
      type: v.type,
      title,
      start_time: start || null,
      end_time: end || null,
      place_name: transport ? null : orNull(v.place_name),
      from_place: transport ? orNull(v.from_place) : null,
      to_place: transport ? orNull(v.to_place) : null,
      notes: orNull(v.notes),
      cost: cost ? Number(cost) : null,
    },
  };
}
