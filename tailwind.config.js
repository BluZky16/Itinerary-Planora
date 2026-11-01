/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'media' makes NativeWind throw on web when the page's color scheme is toggled; dark styles come in phase 7.
  darkMode: 'class',
  theme: {
    extend: {
      // DaisyUI-style semantic color tokens
      colors: {
        primary: '#570df8',
        'primary-content': '#ffffff',
        'base-100': '#ffffff',
        'base-200': '#f2f2f2',
        'base-300': '#e5e6e6',
        'base-content': '#1f2937',
        error: '#f87272',
      },
    },
  },
  plugins: [],
};
