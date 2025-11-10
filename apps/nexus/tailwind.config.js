/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        nexus: {
          primary: '#10b981', // emerald-500
          accent: '#a855f7',  // purple-500
        },
      },
    },
  },
  plugins: [],
};
