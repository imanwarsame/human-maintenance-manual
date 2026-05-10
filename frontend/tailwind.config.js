/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#1a1200',
          300: '#fcd34d',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        surface: {
          0: '#0a0a0c',
          1: '#111114',
          2: '#18181c',
          3: '#26262c',
        },
        ink: {
          primary: '#f0eee8',
          secondary: '#8a8990',
          tertiary: '#525258',
          muted: '#36363c',
        },
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 280ms cubic-bezier(0.4,0,0.2,1) both',
        'fade-up-1': 'fade-up 280ms 60ms cubic-bezier(0.4,0,0.2,1) both',
        'fade-up-2': 'fade-up 280ms 120ms cubic-bezier(0.4,0,0.2,1) both',
        'fade-up-3': 'fade-up 280ms 180ms cubic-bezier(0.4,0,0.2,1) both',
        'fade-in': 'fade-in 200ms ease both',
      },
    },
  },
  plugins: [],
};
