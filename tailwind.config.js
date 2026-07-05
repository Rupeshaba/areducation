/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        /* ── "Indigo Aurora" design system ───────────────────────── */
        primary: {
          50: '#F1EFFE',
          100: '#E4E0FD',
          400: '#8B7CFF',
          500: '#6D5EF5',
          600: '#5A4AE0',
          700: '#4738C2',
          900: '#2A2073',
        },
        mint: {
          400: '#5EEAD4',
          500: '#2DD4BF',
          600: '#14B8A6',
        },
        amber: {
          400: '#FFC94D',
          500: '#FFB020',
          600: '#E8990A',
        },
        danger: {
          400: '#FF8080',
          500: '#FF5C5C',
          600: '#E23F3F',
        },
        dark: {
          900: '#0B0E1A',
          800: '#12162A',
          700: '#1B2036',
          600: '#232A4A',
        },
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'shimmer': 'shimmerPulse 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmerPulse: { '0%,100%': { opacity: 0.4 }, '50%': { opacity: 0.9 } },
      },
    },
  },
  plugins: [],
}
