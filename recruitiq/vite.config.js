import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 5173,
    
    // Security: Proxy API requests to avoid CORS issues in development
    // This allows using relative URLs (/api) in the frontend
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:4000',
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
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
})
