/// <reference types="jest" />
import type { MarkStatus } from '@/api/country-marks';
import { WORLD_SIZE } from '@/lib/world-map';

import { fitView } from './world-map.web';

test('fitView shows the whole world when nothing is marked', () => {
  expect(fitView(new Map())).toEqual([0, 0, WORLD_SIZE.width, WORLD_SIZE.height]);
});

test('fitView zooms to marked countries, at least 260 wide, inside the map', () => {
  const [x, y, w, h] = fitView(new Map<string, MarkStatus>([['FR', 'visited'], ['IT', 'wishlist']]));
  expect(w).toBeGreaterThanOrEqual(260);
  expect(w).toBeLessThan(WORLD_SIZE.width / 2);
  expect(x).toBeGreaterThanOrEqual(0);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(x + w).toBeLessThanOrEqual(WORLD_SIZE.width);
  expect(y + h).toBeLessThanOrEqual(WORLD_SIZE.height);
});
