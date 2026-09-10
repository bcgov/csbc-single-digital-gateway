import { copyFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
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

// The `./styles.css` export is a file, not a module entry, so the lib build never emits it — copy it
// to dist verbatim (as @repo/ui does). Its `@import 'gridstack/…'` resolves in the consumer's CSS build.
const copyAssets = (): Plugin => ({
  name: 'copy-assets',
  closeBundle() {
    const styles = resolve(srcDir, 'styles.css');
    if (existsSync(styles)) {
      copyFileSync(styles, resolve(import.meta.dirname, 'dist/styles.css'));
    }
  },
});

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], tsconfigPath: './tsconfig.build.json', entryRoot: srcDir }),
    copyAssets(),
  ],
  build: {
    sourcemap: true,
    lib: { entry, formats: ['es', 'cjs'] },
    rollupOptions: { external },
  },
});
