// Regenerates the public API of @repo/forms from the source tree (docs 178, 180):
//   - a flat re-export file  src/<flat-name>.ts per submodule (one Vite/dts entry per subpath)
//   - the root entry         src/index.ts    — TYPES ONLY, never a barrel over the submodules
//   - the package.json "exports" map          (one subpath per submodule, '.', and ./styles.css)
// Run after adding or removing a submodule: `npm run gen:entries -w @repo/forms`.
//
// A submodule is any directory under src/ that has an index.ts or index.tsx; helper files live
// deeper in that directory and are not exported, so discovery never descends into a submodule.
// A directory WITHOUT an index is a namespace (e.g. src/renderers/) and its children are searched,
// so src/renderers/ui/index.ts becomes the subpath `./renderers/ui`. The top-level `types`
// directory is never a submodule — it backs the types-only root entry.
//
// Nested subpaths get FLAT entry files (`renderers/ui` → src/renderers-ui.ts → dist/renderers-ui.*)
// so vite.config.ts can keep globbing src/*.ts. Two submodules that flatten to the same name, or a
// submodule that flattens to `index`, would silently overwrite an entry, so discovery throws.
//
// Modelled on packages/ui/scripts/gen-entries.mjs. Like ui's styles.css, the non-module
// ./styles.css export is emitted HERE — a hand-added export would be deleted by the next run.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TYPES_DIR = 'types';
export const STYLES_FILE = 'styles.css';

const INDEX_FILES = ['index.ts', 'index.tsx'];

const hasIndex = (dir) => INDEX_FILES.some((file) => existsSync(resolve(dir, file)));

/** The flat entry name for a (possibly nested) submodule name: `renderers/ui` → `renderers-ui`. */
export function flatEntryName(name) {
  return name.replaceAll('/', '-');
}

/** Throws when two submodules share a flat entry name, or one claims the root `index` entry. */
export function assertUniqueEntryNames(names) {
  const seen = new Map();
  for (const name of names) {
    const flat = flatEntryName(name);
    if (flat === 'index') {
      throw new Error(`Submodule "${name}" flattens to the reserved entry name "index".`);
    }
    if (seen.has(flat)) {
      throw new Error(
        `Submodules "${seen.get(flat)}" and "${name}" both flatten to the entry "${flat}".`,
      );
    }
    seen.set(flat, name);
  }
}

/** Every submodule under src/, as `/`-separated paths relative to src/, sorted. */
export function discoverSubmodules(root) {
  const srcDir = resolve(root, 'src');
  const found = [];

  const walk = (relDir) => {
    for (const dirent of readdirSync(resolve(srcDir, relDir), { withFileTypes: true })) {
      if (!dirent.isDirectory() || (relDir === '' && dirent.name === TYPES_DIR)) continue;
      const rel = relDir === '' ? dirent.name : `${relDir}/${dirent.name}`;
      if (hasIndex(resolve(srcDir, rel))) found.push(rel);
      else walk(rel);
    }
  };

  walk('');
  const names = found.toSorted();
  assertUniqueEntryNames(names);
  return names;
}

/** Whether the package ships a src/styles.css to expose as `./styles.css`. */
export function hasStyles(root) {
  return existsSync(resolve(root, 'src', STYLES_FILE));
}

/** The four conditions for one flat entry name, in the order resolvers must see them. */
const entry = (flat) => ({
  types: `./dist/${flat}.d.ts`,
  development: `./src/${flat}.ts`,
  import: `./dist/${flat}.js`,
  require: `./dist/${flat}.cjs`,
});

/**
 * The exports map for a set of submodule names.
 *
 * The `development` condition points at source so consuming apps compile @repo/forms straight
 * from src in dev (instant HMR); bundlers resolve `import`/`require` to dist for production.
 * Condition order matters: types, then development, then import/require. The stylesheet is a
 * file, not a module, so it carries only `development` (src) and `default` (dist).
 *
 * @param {string[]} names
 * @param {{ styles?: boolean }} [options]
 * @returns {Record<string, Record<string, string>>}
 */
export function buildExportsMap(names, { styles = false } = {}) {
  const map = {
    '.': entry('index'),
    ...Object.fromEntries(names.map((name) => [`./${name}`, entry(flatEntryName(name))])),
  };
  if (styles) {
    map[`./${STYLES_FILE}`] = {
      development: `./src/${STYLES_FILE}`,
      default: `./dist/${STYLES_FILE}`,
    };
  }
  return map;
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

  // 1. Flat re-export per submodule → flat dist/<flat-name>.{js,cjs,d.ts}
  for (const name of names) {
    writeFileSync(resolve(root, `src/${flatEntryName(name)}.ts`), buildFlatEntry(name));
  }

  // 2. Root entry — types only.
  writeFileSync(resolve(root, 'src/index.ts'), buildRootEntry());

  // 3. package.json exports map.
  const pkgPath = resolve(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.exports = buildExportsMap(names, { styles: hasStyles(root) });
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  console.log(`Generated ${names.length} submodule entries + types-only root + exports map.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
