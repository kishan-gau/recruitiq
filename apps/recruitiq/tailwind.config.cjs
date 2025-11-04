/**
 * Tailwind config for RecruitIQ
 * - include index.html and all source files
 * - enable class-based dark mode
 */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  // Content scanning should pick up all classes automatically with Tailwind v3
  // Safelist removed since content paths are comprehensive
  plugins: [],
}
