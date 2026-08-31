import { resolve } from 'node:path';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // tanstackRouter must run before the React plugin.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  // The address geocoder search (feature 154) reaches react-select(-async-paginate) only through the
  // lazily code-split form route via @repo/ui source, so Vite's scanner may miss it — pre-bundle it
  // explicitly or the first form navigation 504s the dynamic import.
  optimizeDeps: {
    include: [
      'react-select',
      'react-select-async-paginate',
      'use-mask-input',
      // Accordion group field (feature 171) — reached only via the lazy form route through
      // @repo/react source, so pre-bundle it or the first application nav 504s the dynamic import.
      '@dnd-kit/react',
      '@dnd-kit/react/sortable',
      '@dnd-kit/helpers',
    ],
  },
  resolve: {
    // @repo/react + @repo/ui (source via the `development` export) and @jsonforms/react / Lexical
    // must all share ONE React instance, or hooks throw.
    dedupe: ['react', 'react-dom'],
    alias: [
      // @repo/ui is consumed from source (its `development` export). Its internal `@ui/*` maps to
      // the ui package's src; our own `@` maps to this app's src — distinct prefixes, no collision.
      { find: '@ui', replacement: resolve(import.meta.dirname, '../../packages/ui/src') },
      { find: '@', replacement: resolve(import.meta.dirname, 'src') },
    ],
  },
  server: { port: 3000 },
});
