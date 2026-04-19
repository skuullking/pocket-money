/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        headline:   ['Epilogue', 'system-ui', 'sans-serif'],
        heading:    ['Epilogue', 'system-ui', 'sans-serif'],
        body:       ['Plus Jakarta Sans', 'DM Sans', 'system-ui', 'sans-serif'],
        label:      ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:       ['JetBrains Mono', 'monospace'],
        'mono-num': ['JetBrains Mono', 'monospace'],
        kid:        ['Epilogue', 'system-ui', 'sans-serif'],
        'kid-body': ['Plus Jakarta Sans', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT:   'rgb(var(--primary) / <alpha-value>)',
          container: 'rgb(var(--primary-container) / <alpha-value>)',
          'fixed':   'rgb(var(--primary-container) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--primary) / <alpha-value>)',
        },
        secondary: {
          DEFAULT:   'rgb(var(--secondary) / <alpha-value>)',
          container: 'rgb(var(--secondary-container) / <alpha-value>)',
          'fixed':   'rgb(var(--secondary-container) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--secondary) / <alpha-value>)',
        },
        surface: {
          DEFAULT:              'rgb(var(--surface) / <alpha-value>)',
          dim:                  'rgb(var(--surface-dim) / <alpha-value>)',
          variant:              'rgb(var(--surface-variant) / <alpha-value>)',
          container:            'rgb(var(--surface-container) / <alpha-value>)',
          'container-low':      'rgb(var(--surface-container-low) / <alpha-value>)',
          'container-high':     'rgb(var(--surface-container-high) / <alpha-value>)',
          'container-highest':  'rgb(var(--surface-container-highest) / <alpha-value>)',
          'container-lowest':   'rgb(var(--surface-container-lowest) / <alpha-value>)',
        },
        background: 'rgb(var(--background) / <alpha-value>)',
        'on-primary':              'rgb(var(--on-primary) / <alpha-value>)',
        'on-primary-container':    'rgb(var(--on-primary-container) / <alpha-value>)',
        'on-secondary':            'rgb(var(--on-secondary) / <alpha-value>)',
        'on-secondary-container':  'rgb(var(--on-secondary-container) / <alpha-value>)',
        'on-surface':              'rgb(var(--on-surface) / <alpha-value>)',
        'on-surface-variant':      'rgb(var(--on-surface-variant) / <alpha-value>)',
        'on-background':           'rgb(var(--on-surface) / <alpha-value>)',
        'on-error':                'rgb(var(--on-error) / <alpha-value>)',
        'on-error-container':      'rgb(var(--on-error-container) / <alpha-value>)',
        'inverse-surface':         'rgb(var(--inverse-surface) / <alpha-value>)',
        'primary-fixed':           'rgb(var(--primary-fixed) / <alpha-value>)',
        tertiary: {
          DEFAULT:     'rgb(var(--tertiary) / <alpha-value>)',
          container:   'rgb(var(--tertiary-container) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--tertiary) / <alpha-value>)',
        },
        'on-tertiary':           'rgb(var(--on-tertiary) / <alpha-value>)',
        'on-tertiary-container': 'rgb(var(--on-tertiary-container) / <alpha-value>)',
        outline: {
          DEFAULT: 'rgb(var(--outline) / <alpha-value>)',
          variant: 'rgb(var(--outline-variant) / <alpha-value>)',
        },
        error: {
          DEFAULT:   'rgb(var(--error) / <alpha-value>)',
          container: 'rgb(var(--error-container) / <alpha-value>)',
        },
      },
      borderRadius: {
        sticker:  '2.5rem',
      },
      boxShadow: {
        clay: '16px 16px 32px rgba(var(--shadow-dark)), -16px -16px 32px rgba(var(--shadow-light)), inset -8px -8px 16px rgba(var(--shadow-inner-dark)), inset 8px 8px 16px rgba(var(--shadow-inner-light))',
        'clay-well': 'inset 8px 8px 16px rgba(var(--shadow-inner-dark)), inset -8px -8px 16px rgba(var(--shadow-inner-light))',
      }
    },
  },
  plugins: [],
}
