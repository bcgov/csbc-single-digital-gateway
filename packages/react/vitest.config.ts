import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // @repo/ui is consumed from source (its `development` export). Its internal `@ui/*`
    // imports must resolve to the ui package's src when we compile that source here.
    alias: [{ find: '@ui', replacement: resolve(import.meta.dirname, '../../packages/ui/src') }],
    // React must be a single instance across @repo/react, @repo/ui source, and
    // @jsonforms/react (which keeps React as an externalized peer) — else invalid-hook-call.
    dedupe: ['react', 'react-dom'],
  },
  test: {
    name: 'react',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
