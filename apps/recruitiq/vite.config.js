import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
    port: 5176,
    watch: {
      usePolling: true,
    },
    
    // Security: Proxy API requests to avoid CORS issues in development
    // This allows using relative URLs (/api) in the frontend
    proxy: {
      '/api': {
        target: 'http://backend:3001',
        changeOrigin: true,
        secure: false,
      }
    },
    
    // Security: Configure headers for development
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    }
  },
  
  build: {
    // Security: Disable source maps in production
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // Performance: Set target for modern browsers
    target: 'es2020',
    
    // Performance: Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    
    // Performance: Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Performance: Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
        },
        // Better caching with content hashes
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      }
    },
    
    // Performance: Optimize deps
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  
  // Performance: Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', '@recruitiq/api-client', '@recruitiq/auth', '@recruitiq/ui', '@recruitiq/utils'],
  },
})
