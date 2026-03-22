/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: { 50: '#FFF9E6', 100: '#FFF0B3', 200: '#FFE680', 300: '#FFD94D', 400: '#FFCC1A', 500: '#C8A951', 600: '#A68B3E', 700: '#84702F', 800: '#635421', 900: '#423813' },
        navy: { 50: '#E8EAF0', 100: '#B8BDD0', 200: '#8890B0', 300: '#586390', 400: '#283670', 500: '#0A1628', 600: '#081220', 700: '#060E18', 800: '#040A10', 900: '#020508' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
};
