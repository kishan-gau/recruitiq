import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['playwright/**', 'e2e/**'],
    // Run tests sequentially to avoid memory issues
    fileParallelism: false,
    // Faster timeouts
    testTimeout: 5000,
    hookTimeout: 5000,
  },
})
