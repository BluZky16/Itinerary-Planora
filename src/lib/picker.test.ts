/// <reference types="jest" />
import { fromPickerDate, toPickerDate } from './picker';

const now = new Date(2026, 10, 5, 14, 7);

test('date round-trips in local time', () => {
  const d = toPickerDate('2026-12-24', 'date', now);
  expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 24]);
  expect(fromPickerDate(d, 'date')).toBe('2026-12-24');
});

test('time round-trips and pads', () => {
  expect(fromPickerDate(toPickerDate('09:05', 'time', now), 'time')).toBe('09:05');
  expect(fromPickerDate(new Date(2026, 0, 1, 7, 3), 'time')).toBe('07:03');
});

test('empty or partial value starts at now', () => {
  expect(toPickerDate('', 'date', now).getTime()).toBe(now.getTime());
  expect(fromPickerDate(toPickerDate('9:3', 'time', now), 'time')).toBe('14:07');
});
