import { copyFileSync, readdirSync, readFileSync } from 'node:fs';
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

// One library entry per flat re-export file in src/ (index + one per component).
// Regenerate the re-exports with `npm run gen:entries` after adding components.
const srcDir = resolve(import.meta.dirname, 'src');
const entry = Object.fromEntries(
  readdirSync(srcDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => [f.replace(/\.ts$/, ''), resolve(srcDir, f)]),
);

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
      entry,
      formats: ['es', 'cjs'],
    },
    rollupOptions: { external },
  },
});
