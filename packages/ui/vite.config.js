import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@recruitiq/auth': resolve(__dirname, '../auth/src/index.ts'),
      '@recruitiq/utils': resolve(__dirname, '../utils/src/index.ts'),
      '@recruitiq/types': resolve(__dirname, '../types/src/index.ts'),
      '@recruitiq/api-client': resolve(__dirname, '../api-client/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RecruitIQUI',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react', 
        'react-dom',
        // Bundle workspace packages instead of externalizing them
        // This allows proper resolution in dev mode
        // '@recruitiq/auth', 
        // '@recruitiq/utils', 
        // '@recruitiq/types',
        // '@recruitiq/api-client'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    cssCodeSplit: false,
  },
});
