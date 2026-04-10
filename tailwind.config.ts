import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        night: {
          950: '#090b10',
          900: '#0d1017',
          800: '#141824',
          700: '#1c2232',
          600: '#2a3246',
          500: '#3a445d',
          400: '#5a6783',
          300: '#7a87a4',
          200: '#a6b0c7',
          100: '#d0d6e4',
        },
        accent: {
          500: '#f97316',
          400: '#fb923c',
          300: '#fdba74',
          200: '#fed7aa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(3, 6, 14, 0.45)',
      },
    },
  },
} satisfies Config
