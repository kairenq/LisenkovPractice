import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(currentDir, 'src/renderer/src'),
    },
  },
});
