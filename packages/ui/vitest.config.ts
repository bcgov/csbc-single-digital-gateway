import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Source-contract tests (e.g. the input surface tokens, doc 173) read files from `src` directly.
  // `import.meta.url` is not resolvable under the test transform and Vite's CSS pipeline returns an
  // empty string for `?raw` stylesheet imports, so hand the suite an absolute path instead.
  define: { __UI_SRC__: JSON.stringify(resolve(import.meta.dirname, 'src')) },
  resolve: {
    alias: { '@ui': resolve(import.meta.dirname, 'src') },
  },
  test: {
    name: 'ui',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
