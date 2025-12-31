import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@core': path.resolve(__dirname, './src/core'),
      '@recruitiq/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
      '@recruitiq/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@recruitiq/types': path.resolve(__dirname, '../../packages/types/src'),
      '@recruitiq/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@recruitiq/utils': path.resolve(__dirname, '../../packages/utils/src'),
    },
  },
  server: {
    port: 5177,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
  },
});
