/// <reference types="jest" />
import { isIsoDate, parseTripForm } from './trip-form';

const valid = { title: ' Bali ', destination: ' ', start_date: '2026-12-24', end_date: '2026-12-31', budget: '', currency: '' };

test('isIsoDate accepts real dates only', () => {
  expect(isIsoDate('2026-12-24')).toBe(true);
  expect(isIsoDate('2028-02-29')).toBe(true);
  expect(isIsoDate('2026-02-30')).toBe(false);
  expect(isIsoDate('2026-1-5')).toBe(false);
  expect(isIsoDate('')).toBe(false);
});

test('valid form is trimmed and empty destination becomes null', () => {
  expect(parseTripForm(valid)).toEqual({
    input: { title: 'Bali', destination: null, start_date: '2026-12-24', end_date: '2026-12-31', budget: null, currency: null },
  });
});

test('one-day trip is allowed', () => {
  expect(parseTripForm({ ...valid, end_date: '2026-12-24' })).toHaveProperty('input');
});

test('trip is capped at 90 days', () => {
  expect(parseTripForm({ ...valid, start_date: '2026-01-01', end_date: '2026-03-31' })).toHaveProperty('input'); // 90 days
  expect(parseTripForm({ ...valid, start_date: '2026-01-01', end_date: '2026-04-01' })).toEqual({
    errors: { end_date: 'A trip can be at most 90 days.' },
  });
});

test('rejects missing title, bad dates and end before start', () => {
  expect(parseTripForm({ ...valid, title: '  ' })).toEqual({ errors: { title: 'Title is required.' } });
  expect(parseTripForm({ ...valid, start_date: '24/12/2026' })).toHaveProperty('errors.start_date');
  expect(parseTripForm({ ...valid, end_date: '2026-12-23' })).toEqual({
    errors: { end_date: 'End date must be on or after the start date.' },
  });
});

test('budget and currency are optional, parsed and validated', () => {
  expect(parseTripForm({ ...valid, budget: ' 1500.5 ', currency: 'usd' })).toHaveProperty('input.budget', 1500.5);
  expect(parseTripForm({ ...valid, budget: '0', currency: 'usd' })).toHaveProperty('input.currency', 'USD');
  expect(parseTripForm({ ...valid, budget: '-1' })).toHaveProperty('errors.budget');
  expect(parseTripForm({ ...valid, budget: 'abc' })).toHaveProperty('errors.budget');
  expect(parseTripForm({ ...valid, currency: 'US' })).toHaveProperty('errors.currency');
});
