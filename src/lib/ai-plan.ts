import type { ItemInput, ItemType } from '@/api/items';
import type { TripInput } from '@/api/trips';

import { parseItemForm } from './item-form';
import { tripDays } from './plan';
import { parseTripForm } from './trip-form';

// The assistant's output is untrusted text. This is the one gate it passes before the app shows it
// or writes it: it reuses the trip and item form rules, so a plan can never save what a form would refuse.

export const MAX_PLAN_ITEMS = 60;
const MAX_TEXT = 200;
const MAX_NOTES = 500;
const MAX_MONEY = 1e12;

// Exhaustive on purpose: an ItemType missing here (or extra) is a compile error.
const ITEM_TYPE: Record<ItemType, true> = { attraction: true, lodging: true, restaurant: true, transport: true, other: true };

export type AiPlan = { trip: TripInput; items: { day: number; input: ItemInput }[] }; // day: 1 = first day of the trip
export type PlanResult = { plan: AiPlan } | { error: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function validatePlan(raw: unknown): PlanResult {
  if (!isRecord(raw)) return { error: 'The plan is not an object.' };

  let bad = ''; // first invalid field; the helpers below record it and return '' so parsing can go on
  const text = (v: unknown, name: string, max = MAX_TEXT) => {
    if (v == null) return '';
    if (typeof v === 'string' && v.length <= max) return v;
    bad ||= `"${name}" is missing, not text, or too long.`;
    return '';
  };
  const money = (v: unknown, name: string) => {
    if (v == null) return '';
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_MONEY) return String(Math.round(v * 100) / 100);
    bad ||= `"${name}" must be a number, 0 or more.`;
    return '';
  };
  // Models like "09:30:00"; the item form wants "09:30".
  const time = (v: unknown, name: string) => {
    const s = text(v, name, 8);
    return /^\d\d:\d\d:\d\d$/.test(s) ? s.slice(0, 5) : s;
  };

  const trip = parseTripForm({
    title: text(raw.title, 'title'),
    destination: text(raw.destination, 'destination'),
    start_date: text(raw.start_date, 'start_date', 10),
    end_date: text(raw.end_date, 'end_date', 10),
    budget: money(raw.budget, 'budget'),
    currency: text(raw.currency, 'currency', 3),
  });
  if (bad) return { error: bad };
  if ('errors' in trip) return { error: Object.values(trip.errors)[0] ?? 'The trip is not valid.' };

  const rawItems = raw.items ?? [];
  if (!Array.isArray(rawItems)) return { error: 'The plan items are not a list.' };
  if (rawItems.length > MAX_PLAN_ITEMS) return { error: `The plan has more than ${MAX_PLAN_ITEMS} items.` };

  const days = tripDays(trip.input);
  const items: AiPlan['items'] = [];
  for (let i = 0; i < rawItems.length; i++) {
    const it: unknown = rawItems[i];
    const at = `Item ${i + 1}`;
    if (!isRecord(it)) return { error: `${at} is not an object.` };
    const { day, type } = it;
    if (typeof day !== 'number' || !Number.isInteger(day) || day < 1 || day > days) {
      return { error: `${at}: day must be a whole number from 1 to ${days}.` };
    }
    // hasOwnProperty, not `in`: "constructor" and "toString" must not pass as types.
    if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(ITEM_TYPE, type)) {
      return { error: `${at}: unknown type.` };
    }
    const item = parseItemForm({
      type: type as ItemType,
      title: text(it.title, 'title'),
      start_time: time(it.start_time, 'start_time'),
      end_time: time(it.end_time, 'end_time'),
      place_name: text(it.place_name, 'place_name'),
      from_place: text(it.from_place, 'from_place'),
      to_place: text(it.to_place, 'to_place'),
      notes: text(it.notes, 'notes', MAX_NOTES),
      cost: money(it.cost, 'cost'),
    });
    if (bad) return { error: `${at}: ${bad}` };
    if ('errors' in item) return { error: `${at}: ${Object.values(item.errors)[0] ?? 'not valid.'}` };
    items.push({ day, input: item.input });
  }
  // The model lists items in any order. By day, then by time; items without a time go last (the sort is stable).
  items.sort((a, b) => a.day - b.day || (a.input.start_time ?? '99').localeCompare(b.input.start_time ?? '99'));
  return { plan: { trip: trip.input, items } };
}
