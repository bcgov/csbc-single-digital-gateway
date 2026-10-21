import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // @repo/ui is consumed from source (its `development` export). Its internal `@ui/*`
    // imports must resolve to packages/ui/src, as they do in platform-web.
    alias: [{ find: '@ui', replacement: resolve(import.meta.dirname, '../ui/src') }],
  },
  test: {
    name: 'documents',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
