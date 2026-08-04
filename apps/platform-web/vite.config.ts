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
    // @repo/react + @repo/ui (source via the `development` export) and @jsonforms/react must all share
    // one React instance, or JSONForms/Lexical hooks throw.
    dedupe: ['react', 'react-dom'],
    alias: [
      // @repo/ui is consumed from source (its `development` export). Its internal `@ui/*` maps to
      // the ui package's src; our own `@` maps to this app's src — distinct prefixes, no collision.
      { find: '@ui', replacement: resolve(import.meta.dirname, '../../packages/ui/src') },
      { find: '@', replacement: resolve(import.meta.dirname, 'src') },
    ],
  },
  // The form-builder's @dnd-kit graph is reachable ONLY through the lazy /forms routes, so Vite
  // wouldn't discover it at startup — first navigation would trigger a dep re-optimization + reload
  // that 504s the in-flight dynamic import ("Failed to fetch dynamically imported module"). Pre-bundle
  // these (incl. the @dnd-kit/dom/sortable subpath we import directly) so they're ready on boot.
  optimizeDeps: {
    include: [
      '@dnd-kit/react',
      '@dnd-kit/react/sortable',
      '@dnd-kit/dom/sortable',
      '@dnd-kit/helpers',
      '@xyflow/react',
      // Address geocoder search (feature 154) — reached only via the lazy form route through
      // @repo/ui source, so pre-bundle it or the first builder/preview nav 504s the dynamic import.
      'react-select',
      'react-select-async-paginate',
    ],
  },
  server: { port: 3001 },
});
