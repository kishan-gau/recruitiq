import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175, // Different port from Paylinq (5174)
    proxy: {
      '/api': {
        target: 'http://localhost:4000', // Backend runs on port 4000
        changeOrigin: true,
      },
    },
  },
});
