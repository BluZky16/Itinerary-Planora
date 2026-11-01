import type { TripInput } from '@/api/trips';

export type TripFormValues = { title: string; destination: string; start_date: string; end_date: string };
export type TripFormErrors = Partial<Record<keyof TripFormValues, string>>;

export const MAX_TRIP_DAYS = 90;

// True only for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30).
export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Returns either errors to show, or the trimmed input to save.
export function parseTripForm(v: TripFormValues): { errors: TripFormErrors } | { input: TripInput } {
  const title = v.title.trim();
  const start = v.start_date.trim();
  const end = v.end_date.trim();
  const errors: TripFormErrors = {};

  if (!title) errors.title = 'Title is required.';
  if (!isIsoDate(start)) errors.start_date = 'Use YYYY-MM-DD, for example 2026-12-24.';
  if (!isIsoDate(end)) errors.end_date = 'Use YYYY-MM-DD, for example 2026-12-31.';
  // ISO dates compare correctly as strings.
  else if (isIsoDate(start) && end < start) errors.end_date = 'End date must be on or after the start date.';
  // Same cap as the trips_max_90_days check in the database: one row per day is created.
  else if (isIsoDate(start) && (Date.parse(end) - Date.parse(start)) / 86_400_000 >= MAX_TRIP_DAYS)
    errors.end_date = `A trip can be at most ${MAX_TRIP_DAYS} days.`;

  if (Object.keys(errors).length) return { errors };
  return { input: { title, destination: v.destination.trim() || null, start_date: start, end_date: end } };
}
