/// <reference types="jest" />
import type { Item } from '@/api/items';
import type { TripPlan } from '@/api/trips';

import { dayTotal, formatDay, moveInPlan, tripTotal } from './plan';

const item = (id: string, day_id: string, position: number, cost: number | null = null): Item => ({
  id, day_id, position, cost, type: 'other', title: id,
  start_time: null, end_time: null, place_name: null, from_place: null, to_place: null, notes: null,
});

const plan: TripPlan = {
  id: 't', title: 'T', destination: null, start_date: '2026-12-01', end_date: '2026-12-02',
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
