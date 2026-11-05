/// <reference types="jest" />
import type { Item } from '@/api/items';
import type { TripPlan } from '@/api/trips';

import { costByType, dayTotal, formatCost, formatDay, localToday, moveInPlan, totalsByCurrency, tripTotal, upcomingTrip } from './plan';

const item = (id: string, day_id: string, position: number, cost: number | null = null): Item => ({
  id, day_id, position, cost, type: 'other', title: id,
  start_time: null, end_time: null, place_name: null, from_place: null, to_place: null, notes: null,
});

const plan: TripPlan = {
  id: 't', title: 'T', destination: null, start_date: '2026-12-01', end_date: '2026-12-02', budget: null, currency: null,
  days: [
    { id: 'd1', date: '2026-12-01', items: [item('a', 'd1', 0, 10), item('b', 'd1', 1), item('c', 'd1', 2, 2.5)] },
    { id: 'd2', date: '2026-12-02', items: [item('x', 'd2', 0, 100)] },
  ],
};

const order = (p: TripPlan) => p.days.map((d) => d.items.map((i) => `${i.id}${i.position}`).join(',')).join(' | ');

test('moveInPlan matches move_item: down, up, and to another day', () => {
  expect(order(moveInPlan(plan, 'a', 'd1', 1))).toBe('b0,a1,c2 | x0');
  expect(order(moveInPlan(plan, 'c', 'd1', 0))).toBe('c0,a1,b2 | x0');
  expect(order(moveInPlan(plan, 'b', 'd2', 99))).toBe('a0,c1 | x0,b1');
  expect(moveInPlan(plan, 'b', 'd2', 99).days[1].items[1].day_id).toBe('d2');
});

test('moveInPlan leaves the original plan untouched', () => {
  moveInPlan(plan, 'a', 'd2', 0);
  expect(order(plan)).toBe('a0,b1,c2 | x0');
});

test('totals skip items without a cost', () => {
  expect(dayTotal(plan.days[0])).toBe(12.5);
  expect(tripTotal(plan)).toBe(112.5);
});

test('formatDay does not shift with time zone', () => {
  expect(formatDay('2026-12-24')).toBe('Thu 24 Dec');
  expect(formatDay('2027-01-01')).toBe('Fri 1 Jan');
});

test('costByType sums per type and skips empty ones', () => {
  const p: TripPlan = {
    ...plan,
    days: [{ id: 'd', date: '2026-12-01', items: [
      { ...item('a', 'd', 0, 10), type: 'lodging' }, { ...item('b', 'd', 1, 5), type: 'lodging' },
      { ...item('c', 'd', 2, 3), type: 'transport' }, item('e', 'd', 3),
    ] }],
  };
  expect(costByType(p)).toEqual({ lodging: 15, transport: 3 });
});

test('totalsByCurrency never mixes currencies and drops zero totals', () => {
  const t = (currency: string | null, cost: number | null) => ({ ...plan, currency, days: [{ id: 'd', date: 'x', items: [item('a', 'd', 0, cost)] }] });
  expect(totalsByCurrency([t('USD', 10), t('IDR', 500), t('USD', 5), t('EUR', null)])).toEqual([
    { currency: 'USD', total: 15 }, { currency: 'IDR', total: 500 },
  ]);
});

test('upcomingTrip picks the first trip starting today or later', () => {
  const trips = [{ start_date: '2026-11-01' }, { start_date: '2026-11-05' }, { start_date: '2026-12-01' }];
  expect(upcomingTrip(trips, '2026-11-05')).toBe(trips[1]);
  expect(upcomingTrip(trips, '2027-01-01')).toBeUndefined();
});

test('localToday uses local calendar fields', () => {
  expect(localToday(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
});

test('formatCost adds the currency when there is one', () => {
  expect(formatCost(1500.5, 'USD')).toBe('USD 1,500.5');
  expect(formatCost(10)).toBe('10');
});

test('tripTotal rounds to cents so a matching budget leaves exactly 0 remaining', () => {
  const p: TripPlan = { ...plan, days: [{ id: 'd', date: 'x', items: [item('a', 'd', 0, 0.1), item('b', 'd', 1, 0.2)] }] };
  expect(tripTotal(p)).toBe(0.3);
  expect(0.3 - tripTotal(p)).toBe(0);
});
