import { resolve } from 'node:path';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const uiDist = resolve(import.meta.dirname, '../../packages/ui/dist');

export default defineConfig({
  plugins: [
    // tanstackRouter must run before the React plugin.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
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
  server: { port: 3000 },
});
