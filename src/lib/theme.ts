import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';
import { useColorScheme } from 'react-native';
import { vars } from 'nativewind';

// One palette per scheme. Tailwind tokens read these as CSS variables (tailwind.config.js);
// props that need a plain color string (spinners, placeholders, navigation) read them from useColors().
// Text colors meet WCAG AA (4.5:1) on base-100 and base-200, also at the opacity-70 used for muted text.
const palette = {
  light: {
    primary: '#570df8',
    'primary-content': '#ffffff',
    'base-100': '#ffffff',
    'base-200': '#f2f2f2',
    'base-300': '#e5e6e6',
    'base-content': '#1f2937',
    muted: '#9ca3af',
    error: '#dc2626',
  },
  dark: {
    primary: '#a78bfa',
    'primary-content': '#1e1b4b',
    'base-100': '#1d232a',
    'base-200': '#111418', // page background; darker than base-100 so cards stand out
    'base-300': '#2a323c',
    'base-content': '#d1d5db',
    muted: '#6b7280',
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
