import type { Day, TripPlan } from '@/api/trips';

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
export const tripTotal = (plan: TripPlan) => plan.days.reduce((sum, d) => sum + dayTotal(d), 0);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-12-24" -> "Thu 24 Dec". Read as UTC so the device time zone never shifts the day.
export function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// Postgres returns "09:30:00"; show "09:30".
export const formatTime = (t: string | null) => (t ? t.slice(0, 5) : '');

// shortcut: no currency symbol until trips get a currency in phase 5.
export const formatCost = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
