/// <reference types="jest" />
import type { AiPlan } from '@/lib/ai-plan';

import { createFromPlan } from './assistant';
import { createItem } from './items';
import { createTrip, deleteTrip, getTripPlan } from './trips';

jest.mock('./items', () => ({ createItem: jest.fn() }));
jest.mock('./trips', () => ({ createTrip: jest.fn(), deleteTrip: jest.fn(), getTripPlan: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: {} })); // the real client needs the .env keys

const item = (title: string) => ({
  type: 'other' as const, title, start_time: null, end_time: null, place_name: null, from_place: null, to_place: null, notes: null, cost: null,
});
const [a, b, c] = [item('a'), item('b'), item('c')];
const plan: AiPlan = {
  trip: { title: 'T', destination: null, start_date: '2026-12-01', end_date: '2026-12-02', budget: null, currency: null },
  items: [{ day: 1, input: a }, { day: 2, input: b }, { day: 1, input: c }],
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(createTrip).mockResolvedValue({ id: 't1' } as Awaited<ReturnType<typeof createTrip>>);
  jest.mocked(getTripPlan).mockResolvedValue({ days: [{ id: 'd1' }, { id: 'd2' }] } as Awaited<ReturnType<typeof getTripPlan>>);
  jest.mocked(createItem).mockResolvedValue(undefined);
  jest.mocked(deleteTrip).mockResolvedValue(undefined);
});

test('puts each item on its day, numbered 0, 1, ... within the day', async () => {
  await createFromPlan(plan);
  expect(jest.mocked(createItem).mock.calls).toEqual([['d1', 0, a], ['d2', 0, b], ['d1', 1, c]]);
  expect(deleteTrip).not.toHaveBeenCalled();
});

test('deletes the trip and rethrows when an item fails', async () => {
  jest.mocked(createItem).mockRejectedValueOnce(new Error('boom'));
  await expect(createFromPlan(plan)).rejects.toThrow('boom');
  expect(deleteTrip).toHaveBeenCalledWith('t1');
});

test('deletes the trip when its days cannot be read', async () => {
  jest.mocked(getTripPlan).mockRejectedValue(new Error('no days'));
  await expect(createFromPlan(plan)).rejects.toThrow('no days');
  expect(deleteTrip).toHaveBeenCalledWith('t1');
  expect(createItem).not.toHaveBeenCalled();
});

test('creates no trip row to clean up when the trip itself fails', async () => {
  jest.mocked(createTrip).mockRejectedValue(new Error('denied'));
  await expect(createFromPlan(plan)).rejects.toThrow('denied');
  expect(deleteTrip).not.toHaveBeenCalled();
});
