/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/app/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
       serif: ['var(--font-heading)', 'serif'],
  sans: ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        bone: {
          DEFAULT: '#FAF9F6',
          dark: '#F2F0E9',
        },
        charcoal: {
          DEFAULT: '#1A1A1A',
          light: '#2D2D2D',
        }
      }
    },
  },
  plugins: [],
}
