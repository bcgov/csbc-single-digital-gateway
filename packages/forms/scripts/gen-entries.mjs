// Regenerates the public API of @repo/forms from the source tree (doc 178):
//   - a flat re-export file  src/<name>.ts   per submodule (one Vite/dts entry per subpath)
//   - the root entry         src/index.ts    — TYPES ONLY, never a barrel over the submodules
//   - the package.json "exports" map          (one subpath per submodule, plus '.')
// Run after adding or removing a submodule: `npm run gen:entries -w @repo/forms`.
//
// A submodule is any top-level directory under src/ (other than `types`) that has an
// index.ts or index.tsx. Helper files live deeper in that directory and are not exported.
// Modelled on packages/ui/scripts/gen-entries.mjs, with two deliberate differences: submodules
// are directories rather than single component files, and the root entry re-exports src/types
// alone so `@repo/forms` stays a types-only surface.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TYPES_DIR = 'types';

/** Top-level src/ directories that expose an index module, excluding the types root. */
export function discoverSubmodules(root) {
  const srcDir = resolve(root, 'src');
  return readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== TYPES_DIR)
    .map((entry) => entry.name)
    .filter((name) =>
      ['index.ts', 'index.tsx'].some((file) => existsSync(resolve(srcDir, name, file))),
    )
    .toSorted();
}

/** The four conditions for one entry name, in the order resolvers must see them. */
const entry = (name) => ({
  types: `./dist/${name}.d.ts`,
  development: `./src/${name}.ts`,
  import: `./dist/${name}.js`,
  require: `./dist/${name}.cjs`,
});

/**
 * The exports map for a set of submodule names.
 *
 * The `development` condition points at source so consuming apps compile @repo/forms straight
 * from src in dev (instant HMR); bundlers resolve `import`/`require` to dist for production.
 * Condition order matters: types, then development, then import/require.
 */
export function buildExportsMap(names) {
  return {
    '.': entry('index'),
    ...Object.fromEntries(names.map((name) => [`./${name}`, entry(name)])),
  };
}

/** The generated body of the types-only root entry. */
export function buildRootEntry() {
  return `export * from './${TYPES_DIR}/index';\n`;
}

/** The generated body of a submodule's flat entry file. */
export function buildFlatEntry(name) {
  return `export * from './${name}/index';\n`;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const names = discoverSubmodules(root);

  // 1. Flat re-export per submodule → flat dist/<name>.{js,cjs,d.ts}
  for (const name of names) {
    writeFileSync(resolve(root, `src/${name}.ts`), buildFlatEntry(name));
  }

  // 2. Root entry — types only.
  writeFileSync(resolve(root, 'src/index.ts'), buildRootEntry());

  // 3. package.json exports map.
  const pkgPath = resolve(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.exports = buildExportsMap(names);
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  console.log(`Generated ${names.length} submodule entries + types-only root + exports map.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
