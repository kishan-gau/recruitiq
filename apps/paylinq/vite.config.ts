import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'], // Ensure single React instance
  },
  optimizeDeps: {
    include: ['@recruitiq/api-client'],
    exclude: [],
  },
  server: {
    port: 5174,
    open: false, // Don't auto-open, use gateway URL instead
    watch: {
      ignored: ['**/node_modules/**', '**/packages/api-client/dist/**'],
    },
    hmr: {
      overlay: true,
      // Let Vite HMR connect directly to port 5174 instead of through gateway
      // This avoids WebSocket proxy issues
      port: 5174,
      host: 'localhost',
    },
    // No proxy needed - gateway handles routing
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
