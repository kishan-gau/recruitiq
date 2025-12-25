import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // @ts-expect-error - pnpm workspace duplicate vite versions cause type conflicts (harmless)
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Map workspace packages to their built output (Docker symlink fix)
      '@recruitiq/api-client': path.resolve(__dirname, '../../packages/api-client/dist/index.js'),
      '@recruitiq/auth': path.resolve(__dirname, '../../packages/auth/dist/index.js'),
      '@recruitiq/ui': path.resolve(__dirname, '../../packages/ui/dist/index.js'),
      '@recruitiq/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
      '@recruitiq/types': path.resolve(__dirname, '../../packages/types/dist/index.d.ts'),
    },
  },
  optimizeDeps: {
    // Exclude workspace packages that are already built
    exclude: ['@recruitiq/api-client', '@recruitiq/auth', '@recruitiq/ui', '@recruitiq/utils', '@recruitiq/types'],
    // Explicitly include axios since api-client depends on it
    include: ['axios'],
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    open: false,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://backend:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
