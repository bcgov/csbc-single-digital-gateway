import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

interface PackageManifest {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as PackageManifest;

// Externalize every runtime dependency and peer dependency (React, @jsonforms/*,
// @repo/ui) so the bundle contains only this package's own source. @repo/ui is
// resolved by the consumer (dev → its src `development` condition, prod → its dist).
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
].map((dep) => new RegExp(`^${dep}(/.*)?$`));

// One library entry per flat re-export file in src/ (index + one per module).
// Regenerate the re-exports with `npm run gen:entries` after adding a module.
const srcDir = resolve(import.meta.dirname, 'src');
const entry = Object.fromEntries(
  readdirSync(srcDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => [f.replace(/\.ts$/, ''), resolve(srcDir, f)]),
);

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      tsconfigPath: './tsconfig.build.json',
      entryRoot: resolve(import.meta.dirname, 'src'),
    }),
  ],
  build: {
    sourcemap: true,
    lib: {
      entry,
      formats: ['es', 'cjs'],
    },
    rollupOptions: { external },
  },
});
