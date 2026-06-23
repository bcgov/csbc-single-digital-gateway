import { resolve } from 'node:path';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  resolve: {
    alias: [
      // @repo/ui is consumed from source (its `development` export). Its internal `@ui/*` maps to
      // the ui package's src; our own `@` maps to this app's src — distinct prefixes, no collision.
      { find: '@ui', replacement: resolve(import.meta.dirname, '../../packages/ui/src') },
      { find: '@', replacement: resolve(import.meta.dirname, 'src') },
    ],
  },
  test: {
    name: 'citizen-portal-web',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
