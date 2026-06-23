import { resolve } from 'node:path';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const uiDist = resolve(import.meta.dirname, '../../packages/ui/dist');

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  resolve: {
    alias: [
      // Consume @repo/ui from its built dist (self-contained), not the `development` source
      // condition whose internal `@/*` collides with this app's `@`→app/src alias. Generalized so
      // every component resolves from dist (styles.css excluded — it's handled by Tailwind/CSS).
      // See .mdd/docs/27 Known Issues for the deeper source-HMR fix.
      { find: /^@repo\/ui$/, replacement: `${uiDist}/index.js` },
      { find: /^@repo\/ui\/(?!styles\.css)(.+)$/, replacement: `${uiDist}/$1.js` },
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
