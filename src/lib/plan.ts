import type { ItemType } from '@/api/items';
import type { Day, TripCosts, TripPlan, Trip } from '@/api/trips';

// Same result as the move_item database function, for an instant (optimistic) update.
export function moveInPlan(plan: TripPlan, itemId: string, dayId: string, index: number): TripPlan {
  const item = plan.days.flatMap((d) => d.items).find((i) => i.id === itemId);
  if (!item) return plan;
  const days = plan.days.map((d) => ({ ...d, items: d.items.filter((i) => i.id !== itemId) }));
  const target = days.find((d) => d.id === dayId);
  if (!target) return plan;
  const at = Math.min(Math.max(index, 0), target.items.length);
  target.items.splice(at, 0, { ...item, day_id: dayId });
  return { ...plan, days: days.map((d) => ({ ...d, items: d.items.map((i, n) => ({ ...i, position: n })) })) };
}

export const dayTotal = (day: Day) => day.items.reduce((sum, i) => sum + (i.cost ?? 0), 0);
type Costed = Pick<TripCosts, 'days'>;
const itemsOf = (t: Costed) => t.days.flatMap((d) => d.items);
// Rounded to cents: 0.1 + 0.2 must equal a 0.3 budget, or "remaining" goes to -5e-17 and reads "over budget".
export const tripTotal = (t: Costed) => Math.round(itemsOf(t).reduce((sum, i) => sum + (i.cost ?? 0), 0) * 100) / 100;

// Planned cost per item type; types with no cost are left out.
export function costByType(t: Costed): Partial<Record<ItemType, number>> {
  const out: Partial<Record<ItemType, number>> = {};
  for (const i of itemsOf(t)) if (i.cost) out[i.type] = (out[i.type] ?? 0) + i.cost;
  return out;
}

// Costs of different currencies are never added together.
export function totalsByCurrency(trips: TripCosts[]): { currency: string | null; total: number }[] {
  const sums = new Map<string | null, number>();
  for (const t of trips) sums.set(t.currency, (sums.get(t.currency) ?? 0) + tripTotal(t));
  return [...sums].map(([currency, total]) => ({ currency, total })).filter((x) => x.total > 0);
}

// Earliest trip starting today or later. Trips must be sorted by start_date; `today` is YYYY-MM-DD.
export const upcomingTrip = <T extends Pick<Trip, 'start_date'>>(trips: T[], today: string): T | undefined =>
  trips.find((t) => t.start_date >= today);

// Device-local calendar date as YYYY-MM-DD (a trip's dates are local, not UTC).
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-12-24" -> "Thu 24 Dec". Read as UTC so the device time zone never shifts the day.
export function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// Postgres returns "09:30:00"; show "09:30".
export const formatTime = (t: string | null) => (t ? t.slice(0, 5) : '');

// "1,500.5" or "USD 1,500.5" when the trip has a currency.
export const formatCost = (n: number, currency?: string | null) =>
  `${currency ? `${currency} ` : ''}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
