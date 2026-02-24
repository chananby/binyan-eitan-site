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
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'Helvetica Neue', 'sans-serif'],
        serif: ['var(--font-heading)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        // פלטת הצבעים המלאה של "בניין איתן"
        bone: {
          DEFAULT: '#FAF9F6',
          dark: '#F0EDE8',
        },
        charcoal: {
          DEFAULT: '#1A1A1A',
          light: '#2D2D2D',
        },
        'warm-gray': {
          DEFAULT: '#B8B2A8',
          light: '#D4CFC7',
        },
        accent: {
          DEFAULT: '#C9A96E', // צבע זהב/פליז אדריכלי
          dark: '#A8893E',
        },
        glass: {
          DEFAULT: 'rgba(250, 249, 246, 0.72)',
          border: 'rgba(26, 26, 26, 0.06)',
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
