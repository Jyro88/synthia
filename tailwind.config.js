/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        element: {
          fire: '#ef4444',
          water: '#3b82f6',
          earth: '#a3a3a3',
          air: '#f3f4f6',
          steam: '#94a3b8',
          mud: '#92400e',
        },
        cream: {
          50: '#fffdf9',
          100: '#fdf8ee',
          200: '#faf1dc',
          300: '#f3e6c8',
        },
        ink: {
          400: '#a89e8f',
          500: '#7a6f5f',
          600: '#5c5344',
          700: '#463f34',
          800: '#332d25',
        },
      },
      fontFamily: {
        display: ['"Shantell Sans"', 'cursive'],
        body: ['Quicksand', 'sans-serif'],
        hand: ['"Shantell Sans"', 'cursive'],
      },
    },
  },
  plugins: [],
}
