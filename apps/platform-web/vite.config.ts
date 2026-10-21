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
  resolve: {
    // @repo/ui and @repo/forms (source via the `development` export) must share ONE React instance
    // with the app, or their hooks throw.
    dedupe: ['react', 'react-dom'],
    alias: [
      // @repo/ui is consumed from source (its `development` export). Its internal `@ui/*` maps to
      // the ui package's src; our own `@` maps to this app's src — distinct prefixes, no collision.
      { find: '@ui', replacement: resolve(import.meta.dirname, '../../packages/ui/src') },
      { find: '@', replacement: resolve(import.meta.dirname, 'src') },
    ],
  },
  // Reached only through lazy routes (or through @repo/ui / @repo/forms source), so Vite wouldn't
  // discover them at startup — the first navigation would trigger a dep re-optimization + reload
  // that 504s the in-flight dynamic import ("Failed to fetch dynamically imported module").
  // Pre-bundle them so they're ready on boot.
  //
  // Feature 217 removed the @dnd-kit entries: they were the form-builder's drag graph, and the
  // builder is gone.
  optimizeDeps: {
    include: [
      '@xyflow/react',
      // Address geocoder search (feature 154) — reached only via the lazy form route through
      // @repo/ui source, so pre-bundle it or the first builder/preview nav 504s the dynamic import.
      'react-select',
      'react-select-async-paginate',
      // Date-picker input mask (feature 157) — same lazy-route-through-@repo/ui-source reason.
      'use-mask-input',
    ],
    // The Form Studio code editors (feature 191) import monaco-editor lazily. Monaco 0.56 starts its workers with
    // `new URL('…worker.js', import.meta.url)`; pre-bundling moves its modules, so those URLs would 404.
    exclude: ['monaco-editor'],
  },
  server: { port: 3001 },
});
