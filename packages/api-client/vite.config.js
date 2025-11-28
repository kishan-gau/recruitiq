import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RecruitIQAPIClient',
      formats: ['es'],
      fileName: 'index',
    },
    // CRITICAL: Don't minify library code - consumers will minify during their build
    minify: false,
    // Generate sourcemaps for debugging
    sourcemap: true,
    rollupOptions: {
      // Externalize dependencies - they should be installed by consumers
      external: ['axios', '@recruitiq/types'],
      output: {
        globals: {
          axios: 'axios',
        },
        // Preserve module structure for better tree-shaking
        preserveModules: false,
      },
    },
  },
});
