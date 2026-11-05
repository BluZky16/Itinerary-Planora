import { Text, View } from 'react-native';

import type { MarkStatus } from '@/api/country-marks';
import { WORLD, WORLD_SIZE } from '@/lib/world-map';

const { width: W, height: H } = WORLD_SIZE;

// Zoom to the marked countries with some margin, or show the whole world when nothing is marked.
export function fitView(marks: Map<string, MarkStatus>): [number, number, number, number] {
  const boxes = WORLD.filter(([code]) => marks.has(code)).map(([, , box]) => box);
  if (!boxes.length) return [0, 0, W, H];
  const x0 = Math.min(...boxes.map((b) => b[0]));
  const y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[0] + b[2]));
  const y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
  // At least 260 wide and about 1.6:1, so one small country is not blown up to fill the card.
  let w = Math.max(x1 - x0 + 60, 260);
  let h = Math.max(y1 - y0 + 60, w / 1.6);
  w = Math.min(Math.max(w, h * 1.6), W);
  h = Math.min(h, H);
  const x = Math.min(Math.max((x0 + x1) / 2 - w / 2, 0), W - w);
  const y = Math.min(Math.max((y0 + y1) / 2 - h / 2, 0), H - h);
  return [x, y, w, h];
}

// Web only: countries coloured by the user's marks. Wishlist is striped, so it does not rely on colour alone.
export function WorldMap({ marks }: { marks: Map<string, MarkStatus> }) {
  const visited = [...marks.values()].filter((s) => s === 'visited').length;
  return (
    <View className="min-h-64 flex-1 gap-2">
      <View className="flex-1 overflow-hidden rounded-2xl bg-sky">
        <svg
          viewBox={fitView(marks).join(' ')}
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={`Map: ${visited} countries visited, ${marks.size - visited} on wishlist`}
          style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <pattern id="wishlist-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" style={{ fill: 'var(--lime)' }} />
              <rect width="2.5" height="6" style={{ fill: 'var(--base-100)' }} />
            </pattern>
          </defs>
          {WORLD.map(([code, path]) => {
            const status = marks.get(code);
            const fill = status === 'visited' ? 'var(--accent)' : status === 'wishlist' ? 'url(#wishlist-stripes)' : 'var(--base-100)';
            // CSS variables only work in style, not in SVG presentation attributes.
            return <path key={code} d={path} vectorEffect="non-scaling-stroke" style={{ fill, stroke: 'var(--sky)', strokeWidth: 0.8 }} />;
          })}
        </svg>
      </View>
      <View className="flex-row flex-wrap justify-center gap-4">
        <Legend className="bg-lime" label="Wishlist (striped)" />
        <Legend className="bg-accent" label="Visited" />
        <Legend className="border border-base-300 bg-base-100" label="Not visited" />
      </View>
    </View>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-3 w-3 rounded-full ${className}`} />
      <Text className="text-sm text-base-content opacity-70">{label}</Text>
    </View>
  );
}
