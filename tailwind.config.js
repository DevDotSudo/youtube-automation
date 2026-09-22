/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'surface': '#111317',
        'surface-dim': '#111317',
        'surface-bright': '#37393d',
        'surface-container-lowest': '#0c0e11',
        'surface-container-low': '#1a1c1f',
        'surface-container': '#1e2023',
        'surface-container-high': '#282a2d',
        'surface-container-highest': '#333538',
        'on-surface': '#e2e2e6',
        'on-surface-variant': '#c7c4d8',
        'outline': '#918fa1',
        'outline-variant': '#464555',
        'primary': '#c4c0ff',
        'primary-container': '#8781ff',
        'on-primary': '#2000a4',
        'on-primary-container': '#1b0091',
        'inverse-primary': '#4f44e2',
        'secondary': '#4edea3',
        'secondary-container': '#00a572',
        'on-secondary': '#003824',
        'on-secondary-container': '#00311f',
        'tertiary': '#ffb95f',
        'tertiary-container': '#ca8100',
        'on-tertiary': '#472a00',
        'on-tertiary-container': '#3e2400',
        'error': '#ffb4ab',
        'error-container': '#93000a',
        'on-error': '#690005',
        'on-error-container': '#ffdad6',
        'background': '#111317',
        'on-background': '#e2e2e6'
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-lg': '1rem',
        'space-xl': '1.5rem',
        'gutter': '0.75rem',
        'margin': '1rem'
      },
      fontFamily: {
        'display': ['Inter', 'sans-serif'],
        'headline-lg': ['Inter', 'sans-serif'],
        'headline-md': ['Inter', 'sans-serif'],
        'headline-sm': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'label-md': ['Inter', 'sans-serif'],
        'label-sm': ['Inter', 'sans-serif'],
        'code-meta': ['JetBrains Mono', 'monospace'],
        'timecode': ['JetBrains Mono', 'monospace']
      },
      fontSize: {
        'display': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md': ['18px', { lineHeight: '26px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['16px', { lineHeight: '24px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body-lg': ['15px', { lineHeight: '22px', letterSpacing: '0em', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', letterSpacing: '0em', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', letterSpacing: '0.005em', fontWeight: '400' }],
        'label-md': ['13px', { lineHeight: '18px', letterSpacing: '0.01em', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.015em', fontWeight: '500' }],
        'code-meta': ['12px', { lineHeight: '16px', letterSpacing: '0em', fontWeight: '400' }],
        'timecode': ['13px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '600' }]
      }
    }
  },
  plugins: []
};
