/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'media' makes NativeWind throw on web when the page's color scheme is toggled. Dark mode does not use
  // dark: classes: the root layout swaps the CSS variables below (src/lib/theme.ts).
  darkMode: 'class',
  theme: {
    extend: {
      // DaisyUI-style semantic color tokens; values per light/dark scheme live in src/lib/theme.ts.
      colors: {
        primary: 'var(--primary)',
        'primary-content': 'var(--primary-content)',
        accent: 'var(--accent)',
        'accent-content': 'var(--accent-content)',
        lime: 'var(--lime)',
        'lime-content': 'var(--lime-content)',
        'base-100': 'var(--base-100)',
        'base-200': 'var(--base-200)',
        'base-300': 'var(--base-300)',
        'base-content': 'var(--base-content)',
        error: 'var(--error)',
        sky: 'var(--sky)',
        tint: 'var(--tint)',
        surface: 'var(--surface)',
      },
      // Hand-drawn marker font for titles. Loaded on web only (root layout <Head>); phones fall back to the system font.
      fontFamily: { display: ['"Permanent Marker"', 'sans-serif'] },
    },
  },
  plugins: [],
};
