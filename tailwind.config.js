/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // חיבור ישיר לפונטים שהוגדרו ב-layout כדי להבטיח מראה נקי ואחיד
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        serif: ['var(--font-heading)', 'sans-serif'],
        sans: ['var(--font-body)', 'sans-serif'],
        // Math App — Heebo already loaded in root layout
        heebo: ['var(--font-heebo)', 'Arial', 'sans-serif'],
      },
      colors: {
        // Natural Luxury palette — Warm Stone × Deep Chocolate × Muted Bronze
        bone: {
          DEFAULT: '#F3F2EE',
          dark: '#E8E7E3',
        },
        charcoal: {
          DEFAULT: '#2D2926',
          light: '#3D3733',
        },
        'warm-gray': {
          DEFAULT: '#B0ABA5',
          light: '#D1CFCA',
        },
        accent: {
          DEFAULT: '#8D775F', // Muted Bronze
          dark: '#7A6451',
        },
        glass: {
          DEFAULT: 'rgba(243, 242, 238, 0.88)',
          border: 'rgba(45, 41, 38, 0.06)',
        },
        // Math App — blue brand palette
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      keyframes: {
        // Math App animations
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':       { transform: 'translateX(-6px)' },
          '40%':       { transform: 'translateX(6px)' },
          '60%':       { transform: 'translateX(-4px)' },
          '80%':       { transform: 'translateX(4px)' },
        },
        fadein: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shake:  'shake 0.5s ease',
        fadein: 'fadein 0.3s ease',
      },
      transitionTimingFunction: {
        // עקומות אנימציה יוקרתיות (Easing) לתנועה חלקה ו"כבדה" יותר
        'ease-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'ease-in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
    },
  },
  plugins: [],
}
