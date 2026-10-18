import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        ink: { DEFAULT: '#0A0A0A', 900: '#0A0A0A', 800: '#141414', 700: '#1C1C1C', 600: '#262626', 500: '#3A3A3A' },
        lime: { DEFAULT: '#C6FF00', 400: '#D4FF40', 600: '#A8D900' },
        blaze: { DEFAULT: '#FF5F1F', 400: '#FF7F4A' },
        border: 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Anton', 'Impact', 'sans-serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '20px', '2xl': '24px' },
      boxShadow: {
        glow: '0 0 0 1px rgba(198,255,0,.35), 0 0 24px rgba(198,255,0,.35), 0 0 64px rgba(198,255,0,.15)',
        'glow-sm': '0 0 0 1px rgba(198,255,0,.3), 0 0 14px rgba(198,255,0,.25)',
        'glow-orange': '0 0 0 1px rgba(255,95,31,.4), 0 0 28px rgba(255,95,31,.35)',
        card: '0 1px 0 rgba(255,255,255,.04) inset, 0 20px 40px -20px rgba(0,0,0,.8)',
      },
      keyframes: {
        kenburns: { '0%': { transform: 'scale(1) translate(0,0)' }, '100%': { transform: 'scale(1.18) translate(-2%,-3%)' } },
        pulseglow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(198,255,0,.55), 0 0 30px rgba(198,255,0,.35)' },
          '50%': { boxShadow: '0 0 0 14px rgba(198,255,0,0), 0 0 60px rgba(198,255,0,.55)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        flicker: { '0%,100%': { transform: 'scale(1) rotate(-2deg)' }, '50%': { transform: 'scale(1.12) rotate(3deg)' } },
      },
      animation: {
        kenburns: 'kenburns 22s ease-in-out infinite alternate',
        pulseglow: 'pulseglow 2.2s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        flicker: 'flicker 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
