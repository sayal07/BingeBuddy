/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        brand: {
          300: '#8fa3fc',
          400: '#5c7cfa',
          500: '#4c6ef5',
          600: '#4263eb',
          700: '#3b5bdb',
        },
        surface: {
          50: '#f1f3f5',
          100: '#e9ecef',
          200: '#dee2e6',
          700: '#1a1b2e',
          800: '#141522',
          900: '#0f1019',
        },
        dark: {
          bg: '#0f0f23',
          card: '#1a1a2e',
          border: '#2d2d44',
          text: '#e4e4f0',
        }
      },
      fontFamily: {
        display: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
