/** @type {import('tailwindcss').Config} */
const token = name => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        headline: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: token('primary'), container: token('primary-container') },
        secondary: { DEFAULT: token('secondary') },
        surface: { DEFAULT: token('surface'), container: token('surface-container') },
        background: token('background'),
        'on-primary': token('on-primary'),
        'on-primary-container': token('on-primary-container'),
        'on-secondary': token('on-secondary'),
        'on-surface': token('on-surface'),
        'on-surface-variant': token('on-surface-variant'),
        'on-error': token('on-error'),
        'on-error-container': token('on-error-container'),
        outline: { DEFAULT: token('outline'), variant: token('outline-variant') },
        error: { DEFAULT: token('error'), container: token('error-container') },
        gain: { DEFAULT: token('gain'), container: token('gain-container') },
        gold: { DEFAULT: token('gold'), edge: token('gold-edge'), label: token('gold-label') },
        'on-gold': token('on-gold'),
        line: token('line'),
        press: token('press'),
        hero: token('hero'),
        nav: { DEFAULT: token('nav'), active: token('nav-active') },
        'on-nav': token('on-nav'),
        'on-nav-muted': token('on-nav-muted'),
      },
      boxShadow: {
        press: '0 4px 0 rgb(var(--press))',
        'press-lg': '0 5px 0 rgb(var(--press))',
        coin: '0 10px 0 rgb(var(--press))',
      },
    },
  },
  plugins: [],
};
