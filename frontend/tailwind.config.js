/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",  // Adjust this if your components live elsewhere
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {

      colors: {
        background: {
          light: '#aed6f1',
          dark: '#212f3d',
        },
        text: {
          light: '#000000',
          dark: '#ffffff',
        }
      },

      perspective: {
        800: '800px',
        1000: '1000px',
        1400: '1400px',
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
      },
    },
  },
  plugins: [],
}
