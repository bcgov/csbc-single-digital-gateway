// Regenerates the per-module public API from the module folders under src/*/index.ts:
//   - a flat re-export file  src/<module>.ts     (one Vite/dts entry per module)
//   - the barrel             src/index.ts
//   - the package.json "exports" map             (one subpath per module)
// Run after adding/removing a module: `npm run gen:entries` (from packages/react).
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(root, 'src');

// A "module" is a directory under src/ that has an index.ts barrel.
const modules = readdirSync(srcDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(resolve(srcDir, e.name, 'index.ts')))
  .map((e) => e.name)
  .toSorted();

// 1. Flat re-export per module → flat dist/<module>.{js,cjs,d.ts}. Reference the
//    directory index explicitly (`./<module>/index`) so the file never re-exports itself.
for (const name of modules) {
  writeFileSync(resolve(srcDir, `${name}.ts`), `export * from './${name}/index';\n`);
}

// 1b. Remove ORPHANED flat entries — a `src/<name>.ts` with no `src/<name>/index.ts` beside it.
//     Without this, deleting a module leaves its entry file behind, the barrel keeps re-exporting
//     a directory that no longer exists, and the build fails on a module nobody asked for.
for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name === 'index.ts') {
    continue;
  }
  const name = entry.name.slice(0, -'.ts'.length);
  if (!modules.includes(name)) {
    rmSync(resolve(srcDir, entry.name));
  }
}

// 2. Barrel (root export) → re-export each flat module entry.
writeFileSync(
  resolve(srcDir, 'index.ts'),
  modules.map((name) => `export * from './${name}';`).join('\n') + '\n',
);

// 3. package.json exports map: '.', then each module subpath. The `development`
//    condition points at source so consuming apps compile @repo/react from src in dev
//    (instant HMR). Bundlers resolve `import`/`require` → dist for production builds.
//    Condition order matters: types, then development, then import/require.
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const exportsMap = {
  '.': {
    types: './dist/index.d.ts',
    development: './src/index.ts',
    import: './dist/index.js',
    require: './dist/index.cjs',
  },
};
for (const name of modules) {
  exportsMap[`./${name}`] = {
    types: `./dist/${name}.d.ts`,
    development: `./src/${name}.ts`,
    import: `./dist/${name}.js`,
    require: `./dist/${name}.cjs`,
  };
}
pkg.exports = exportsMap;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Generated ${modules.length} module entries + barrel + exports map.`);
