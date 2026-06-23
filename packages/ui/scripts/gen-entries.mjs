// Regenerates the per-component public API from src/components/ui/*.tsx:
//   - a flat re-export file  src/<name>.ts        (one Vite/dts entry per component)
//   - the barrel             src/index.ts
//   - the package.json "exports" map              (one subpath per component)
// Run after adding/removing components: `npm run gen:entries` (from packages/ui).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uiDir = resolve(root, 'src/components/ui');

const names = readdirSync(uiDir)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => f.replace(/\.tsx$/, ''))
  .toSorted();

// 1. Flat re-export per component → flat dist/<name>.{js,cjs,d.ts}
for (const name of names) {
  writeFileSync(resolve(root, `src/${name}.ts`), `export * from './components/ui/${name}';\n`);
}

// 2. Barrel
writeFileSync(
  resolve(root, 'src/index.ts'),
  names.map((name) => `export * from './${name}';`).join('\n') + '\n',
);

// 3. package.json exports map: '.', then each component subpath, then styles.css
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
// The `development` condition points at source so consuming apps compile @repo/ui
// straight from src in dev (instant HMR, no library build). Bundlers resolve `import`/
// `require` → dist for production builds. Condition order matters: types, then
// development, then import/require.
const exportsMap = {
  '.': {
    types: './dist/index.d.ts',
    development: './src/index.ts',
    import: './dist/index.js',
    require: './dist/index.cjs',
  },
};
for (const name of names) {
  exportsMap[`./${name}`] = {
    types: `./dist/${name}.d.ts`,
    development: `./src/${name}.ts`,
    import: `./dist/${name}.js`,
    require: `./dist/${name}.cjs`,
  };
}
exportsMap['./styles.css'] = {
  development: './src/styles.css',
  default: './dist/styles.css',
};
pkg.exports = exportsMap;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Generated ${names.length} component entries + barrel + exports map.`);
