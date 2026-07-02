import { resolve } from 'node:path';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  resolve: {
    // Single React instance across @repo/react, @repo/ui source, @jsonforms/react and Lexical.
    dedupe: ['react', 'react-dom'],
    alias: [
      // @repo/ui is consumed from source (its `development` export). Its internal `@ui/*` maps to
      // the ui package's src; our own `@` maps to this app's src — distinct prefixes, no collision.
      { find: '@ui', replacement: resolve(import.meta.dirname, '../../packages/ui/src') },
      { find: '@', replacement: resolve(import.meta.dirname, 'src') },
    ],
  },
  test: {
    name: 'platform-web',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    // The heavy interaction tests (JsonForms + Lexical + code-split routes under jsdom) run 2–5s
    // each in isolation. The pre-push hook runs `typecheck` (turbo build) and the full `test`
    // suite in parallel, and under that CPU contention these tests balloon past Vitest's 5s
    // default and flake with "Test timed out in 5000ms". Give them ample headroom.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
