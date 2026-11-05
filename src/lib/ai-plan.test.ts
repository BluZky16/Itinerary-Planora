/// <reference types="jest" />
import { MAX_PLAN_ITEMS, validatePlan } from './ai-plan';

const base = { title: ' Bali ', destination: 'Bali, Indonesia', start_date: '2026-12-01', end_date: '2026-12-03', budget: 1000, currency: 'USD' };
const hotel = { day: 1, type: 'lodging', title: 'Hotel Ubud', place_name: 'Hotel Ubud', cost: 300 };
const withItems = (...items: unknown[]) => ({ ...base, items });
const error = (raw: unknown) => {
  const r = validatePlan(raw);
  if (!('error' in r)) throw new Error('expected an error');
  return r.error;
};

test('valid plan is trimmed and items become item inputs', () => {
  const r = validatePlan(
    withItems(hotel, { day: 2, type: 'transport', title: 'Taxi', from_place: 'Airport', to_place: 'Ubud', start_time: '09:30:00', cost: 12.5 }, { day: 3, type: 'restaurant', title: 'Dinner' }),
  );
  expect(r).toEqual({
    plan: {
      trip: { title: 'Bali', destination: 'Bali, Indonesia', start_date: '2026-12-01', end_date: '2026-12-03', budget: 1000, currency: 'USD' },
      items: [
        { day: 1, input: { type: 'lodging', title: 'Hotel Ubud', start_time: null, end_time: null, place_name: 'Hotel Ubud', from_place: null, to_place: null, notes: null, cost: 300 } },
        { day: 2, input: { type: 'transport', title: 'Taxi', start_time: '09:30', end_time: null, place_name: null, from_place: 'Airport', to_place: 'Ubud', notes: null, cost: 12.5 } },
        { day: 3, input: { type: 'restaurant', title: 'Dinner', start_time: null, end_time: null, place_name: null, from_place: null, to_place: null, notes: null, cost: null } },
      ],
    },
  });
});

test('a plan with no items, or no optional trip fields, is fine', () => {
  expect(validatePlan({ title: 'Trip', start_date: '2026-12-01', end_date: '2026-12-01' })).toHaveProperty('plan');
});

test('money is rounded to cents', () => {
  const r = validatePlan(withItems({ ...hotel, cost: 0.1 + 0.2 }));
  expect('plan' in r && r.plan.items[0].input.cost).toBe(0.3);
});

test('rejects anything that is not an object', () => {
  for (const raw of [null, undefined, 'plan', 5, [], true]) expect(validatePlan(raw)).toHaveProperty('error');
});

test('rejects bad trip fields with the form message', () => {
  expect(error({ ...base, title: '' })).toBe('Title is required.');
  expect(error({ ...base, end_date: '2026-11-30' })).toMatch(/on or after/);
  expect(error({ ...base, end_date: '2027-03-01' })).toMatch(/at most 90 days/);
  expect(error({ ...base, start_date: '2026-02-30' })).toMatch(/start date/);
  expect(error({ ...base, currency: 'US' })).toMatch(/3-letter/);
});

test('rejects wrong types, negative and huge money, and long text', () => {
  expect(error({ ...base, title: 42 })).toMatch(/"title"/);
  expect(error({ ...base, budget: '1000' })).toMatch(/"budget"/);
  expect(error({ ...base, budget: -1 })).toMatch(/"budget"/);
  expect(error({ ...base, budget: 1e15 })).toMatch(/"budget"/);
  expect(error({ ...base, budget: Infinity })).toMatch(/"budget"/);
  expect(error({ ...base, title: 'x'.repeat(201) })).toMatch(/"title"/);
  expect(error(withItems({ ...hotel, notes: 'x'.repeat(501) }))).toMatch(/Item 1: "notes"/);
});

test('rejects items outside the trip, with unknown types, or malformed', () => {
  expect(error(withItems({ ...hotel, day: 0 }))).toMatch(/Item 1: day must be .* 1 to 3/);
  expect(error(withItems({ ...hotel, day: 4 }))).toMatch(/1 to 3/);
  expect(error(withItems({ ...hotel, day: 1.5 }))).toMatch(/whole number/);
  expect(error(withItems({ ...hotel, day: '1' }))).toMatch(/whole number/);
  expect(error(withItems(hotel, { ...hotel, type: 'museum' }))).toBe('Item 2: unknown type.');
  expect(error(withItems({ ...hotel, type: 'constructor' }))).toMatch(/unknown type/);
  expect(error(withItems({ ...hotel, type: 'toString' }))).toMatch(/unknown type/);
  expect(error(withItems('hotel'))).toMatch(/Item 1 is not an object/);
  expect(error(withItems({ ...hotel, title: '' }))).toBe('Item 1: Title is required.');
  expect(error(withItems({ ...hotel, start_time: '9am' }))).toMatch(/HH:MM/);
  expect(error(withItems({ ...hotel, cost: -5 }))).toMatch(/"cost"/);
  expect(error({ ...base, items: 'none' })).toMatch(/not a list/);
});

test('items are sorted by day, then by time, with untimed items last', () => {
  const r = validatePlan(
    withItems(
      { day: 2, type: 'other', title: 'late', start_time: '18:00' },
      { day: 1, type: 'other', title: 'untimed' },
      { day: 1, type: 'other', title: 'afternoon', start_time: '14:00' },
      { day: 1, type: 'other', title: 'morning', start_time: '09:30' },
      { day: 2, type: 'other', title: 'early', start_time: '08:00' },
    ),
  );
  expect('plan' in r && r.plan.items.map((i) => i.input.title)).toEqual(['morning', 'afternoon', 'untimed', 'early', 'late']);
});

test('caps the number of items', () => {
  const ok = Array.from({ length: MAX_PLAN_ITEMS }, () => hotel);
  expect(validatePlan({ ...base, items: ok })).toHaveProperty('plan');
  expect(error({ ...base, items: [...ok, hotel] })).toMatch(/more than 60/);
});

test('unknown fields are dropped, not saved', () => {
  const r = validatePlan({ ...base, share_token: 'x', owner_id: 'y', items: [{ ...hotel, day_id: 'z', id: '1' }] });
  expect(r).toHaveProperty('plan');
  if ('plan' in r) {
    expect(Object.keys(r.plan.trip).sort()).toEqual(['budget', 'currency', 'destination', 'end_date', 'start_date', 'title']);
    expect(Object.keys(r.plan.items[0].input)).not.toContain('day_id');
  }
});
