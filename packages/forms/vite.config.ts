import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const srcDir = resolve(import.meta.dirname, 'src');
const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'),
) as Record<string, Record<string, string> | undefined>;

// Never bundle react or a workspace dependency into the library — the consuming app owns them.
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
].map((dep) => new RegExp(`^${dep}(/.*)?$`));

// One library entry per flat src/*.ts file (written by scripts/gen-entries.mjs), so each
// package.json export subpath resolves to its own flat dist artifact.
const entry = Object.fromEntries(
  readdirSync(srcDir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => [file.replace(/\.ts$/, ''), resolve(srcDir, file)]),
);

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], tsconfigPath: './tsconfig.build.json', entryRoot: srcDir }),
  ],
  build: {
    sourcemap: true,
    lib: { entry, formats: ['es', 'cjs'] },
    rollupOptions: { external },
  },
});
