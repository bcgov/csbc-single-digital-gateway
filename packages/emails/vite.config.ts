import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

interface PackageManifest {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as PackageManifest;

// Externalize every runtime/peer dependency (react, @react-email/*, ...) plus Node builtins
// so the bundle contains only this package's own source. The `^dep(/.*)?$` form also covers
// subpaths like react/jsx-runtime.
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
]
  .map((dep) => new RegExp(`^${dep}(/.*)?$`))
  .concat(/^node:/, ...builtinModules.map((m) => new RegExp(`^${m}$`)));

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['test'],
      tsconfigPath: './tsconfig.build.json',
      entryRoot: resolve(import.meta.dirname, 'src'),
    }),
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: { index: resolve(import.meta.dirname, 'src/index.ts') },
      formats: ['es', 'cjs'],
    },
    rollupOptions: { external },
  },
});
