import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Proxy API requests to unified backend
      // This allows using relative URLs (/api) in the frontend
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:4000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost', // Rewrite cookie domain for SSO
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
