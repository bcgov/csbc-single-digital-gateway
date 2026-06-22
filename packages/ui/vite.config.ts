import { copyFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';

interface PackageManifest {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as PackageManifest;

// Externalize every runtime dependency and peer dependency (React, Base UI, cva,
// clsx, tailwind-merge, lucide, ...) so the bundle contains only this package's source.
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
].map((dep) => new RegExp(`^${dep}(/.*)?$`));

// Ship the theme-token stylesheet verbatim; consumers run Tailwind v4 against it.
const copyStyles = (): Plugin => ({
  name: 'copy-styles',
  closeBundle() {
    copyFileSync(
      resolve(import.meta.dirname, 'src/styles.css'),
      resolve(import.meta.dirname, 'dist/styles.css'),
    );
  },
});

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    dts({
      include: ['src'],
      tsconfigPath: './tsconfig.build.json',
      entryRoot: resolve(import.meta.dirname, 'src'),
    }),
    copyStyles(),
  ],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  build: {
    sourcemap: true,
    lib: {
      // One entry per public component (flat re-export files) + the barrel.
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        button: resolve(import.meta.dirname, 'src/button.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: { external },
  },
});
