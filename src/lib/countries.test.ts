/// <reference types="jest" />
import { COUNTRIES, filterCountries } from './countries';

test('every country has a unique 2-letter code and a name', () => {
  expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
  expect(COUNTRIES.every((c) => /^[A-Z]{2}$/.test(c.code) && c.name.length > 1)).toBe(true);
  expect(COUNTRIES.length).toBeGreaterThan(240);
});

test('filterCountries matches names case-insensitively', () => {
  expect(filterCountries(' japan ').map((c) => c.code)).toEqual(['JP']);
  expect(filterCountries('')).toBe(COUNTRIES);
});
