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
        }
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
