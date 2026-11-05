import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';
import { useColorScheme } from 'react-native';
import { vars } from 'nativewind';

// One palette per scheme. Tailwind tokens read these as CSS variables (tailwind.config.js);
// props that need a plain color string (spinners, placeholders, navigation) read them from useColors().
// Text colors meet WCAG AA (4.5:1) on base-100 and base-200, also at the opacity-70 used for muted text.
const palette = {
  // Pastel "glass" look: sky-blue page, translucent white cards, pastel pink fills, lime highlights.
  light: {
    primary: '#be185d', // text, icons, focus ring: deep pink so it passes AA on the light cards
    'primary-content': '#ffffff',
    accent: '#f6b6e3', // pastel pink fill (main buttons, selected chips, "visited")
    'accent-content': '#1e1b2e',
    lime: '#d9f26b', // "wishlist" highlight
    'lime-content': '#1e2a0a',
    'base-100': 'rgba(255,255,255,0.62)', // glass card
    'base-200': '#e6eff8', // page background (web paints a gradient over it, see global.css)
    'base-300': '#d3e2f0', // card edges, input borders
    'base-content': '#1e2a3a',
    sky: '#c7ddf2', // second gradient stop
    muted: '#7d8ca0',
    error: '#dc2626',
  },
  dark: {
    primary: '#f9a8d4',
    'primary-content': '#3b0a2a',
    accent: '#f9a8d4',
    'accent-content': '#2a0f22',
    lime: '#d9f26b',
    'lime-content': '#1e2a0a',
    'base-100': 'rgba(30,41,59,0.62)',
    'base-200': '#0e1726',
    'base-300': 'rgba(148,163,184,0.25)',
    'base-content': '#dbe4ef',
    sky: '#17304d',
    muted: '#7c8aa0',
    error: '#f87171',
  },
};
export type Colors = (typeof palette)['light'];

export function useColors(): Colors {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

// Style for the root view: sets the CSS variables every className color uses.
export const themeVars = (c: Colors) =>
  vars(Object.fromEntries(Object.entries(c).map(([k, v]) => [`--${k}`, v])));

// Header and tab bar colors for React Navigation.
export function navTheme(c: Colors, dark: boolean): Theme {
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c['base-200'],
      card: c['base-100'],
      text: c['base-content'],
      border: c['base-300'],
    },
  };
}
