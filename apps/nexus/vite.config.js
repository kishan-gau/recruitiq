import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
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
    server: {
        host: '0.0.0.0',
        port: 5173,
        watch: {
            usePolling: true,
        },
        proxy: {
            '/api': {
                target: process.env.VITE_API_PROXY_TARGET || 'http://backend:3001',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    optimizeDeps: {
        // Exclude workspace packages from optimization - they're pre-built libraries
        // Include their peer dependencies (axios) that need optimization
        exclude: ['@recruitiq/api-client', '@recruitiq/auth', '@recruitiq/ui', '@recruitiq/utils', '@recruitiq/types'],
        include: ['axios'],
    },
});
