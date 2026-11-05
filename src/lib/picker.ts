import { localToday } from '@/lib/plan';

// The forms keep dates as 'YYYY-MM-DD' and times as 'HH:MM'; native pickers work with Date objects (local time).
export type PickerMode = 'date' | 'time';

export function toPickerDate(value: string, mode: PickerMode, now = new Date()): Date {
  const d = new Date(now);
  const m = mode === 'date' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return d; // empty or not yet valid: start the picker at now
  if (mode === 'date') return new Date(+m[1], +m[2] - 1, +m[3]);
  d.setHours(+m[1], +m[2], 0, 0);
  return d;
}

export function fromPickerDate(d: Date, mode: PickerMode): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return mode === 'date' ? localToday(d) : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
