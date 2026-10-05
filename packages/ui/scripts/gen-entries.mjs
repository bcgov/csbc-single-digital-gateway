// Regenerates the per-component public API from the component sources:
//   - src/components/ui/*.tsx (shadcn primitives), src/brand/*.tsx (brand marks),
//     src/inputs/*.tsx (non-shadcn inputs), src/layout/*.tsx (layout primitives) and
//     src/typography/*.tsx (typography primitives) and src/data/*.tsx (data display composites)
//   - a flat re-export file  src/<name>.ts          (one Vite/dts entry per component)
//   - the barrel             src/index.ts
//   - the package.json "exports" map               (one subpath per component, plus a raw
//     URL export per src/brand/*.svg, plus styles.css)
// Run after adding/removing components or brand assets: `npm run gen:entries` (from packages/ui).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uiDir = resolve(root, 'src/components/ui');
const brandDir = resolve(root, 'src/brand');
// Non-shadcn input components (e.g. the Lexical rich-text input) live here, NOT under components/ui.
// Only top-level *.tsx are globbed → helper files go in a subdir (src/inputs/<name>/) and aren't exported.
const inputsDir = resolve(root, 'src/inputs');
// Hand-written layout primitives (e.g. PageHeader) live here, NOT under components/ui — that path
// carries the vendored-shadcn lint exceptions (no-shadow, no-underscore-dangle), which must not
// extend to code we author. Same top-level-*.tsx-only rule as src/inputs.
const layoutDir = resolve(root, 'src/layout');
// Typography primitives (e.g. Heading) live here for the same reason as src/layout — authored
// code must stay out of src/components/ui, whose lint override relaxes the vendored-shadcn rules.
// Same top-level-*.tsx-only rule as src/inputs and src/layout.
const typographyDir = resolve(root, 'src/typography');
// Hand-written data display composites (e.g. DataTable, doc 263) — same reason and same
// top-level-*.tsx-only rule as src/layout; helpers live in src/data/<name>/.
const dataDir = resolve(root, 'src/data');

const tsxNames = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.tsx'))
        .map((f) => f.replace(/\.tsx$/, ''))
    : [];

// name -> source dir under src/, used to author the flat re-export target.
const uiNames = tsxNames(uiDir);
const brandNames = tsxNames(brandDir);
const inputNames = tsxNames(inputsDir);
const layoutNames = tsxNames(layoutDir);
const typographyNames = tsxNames(typographyDir);
const dataNames = tsxNames(dataDir);
const sourceDir = new Map([
  ...uiNames.map((n) => [n, 'components/ui']),
  ...brandNames.map((n) => [n, 'brand']),
  ...inputNames.map((n) => [n, 'inputs']),
  ...layoutNames.map((n) => [n, 'layout']),
  ...typographyNames.map((n) => [n, 'typography']),
  ...dataNames.map((n) => [n, 'data']),
]);
const names = [
  ...uiNames,
  ...brandNames,
  ...inputNames,
  ...layoutNames,
  ...typographyNames,
  ...dataNames,
].toSorted();

// Raw brand assets shipped verbatim (icon.svg, logo.svg) — exported as URLs.
const brandSvgs = existsSync(brandDir)
  ? readdirSync(brandDir)
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.replace(/\.svg$/, ''))
      .toSorted()
  : [];

// 1. Flat re-export per component → flat dist/<name>.{js,cjs,d.ts}
for (const name of names) {
  writeFileSync(
    resolve(root, `src/${name}.ts`),
    `export * from './${sourceDir.get(name)}/${name}';\n`,
  );
}

// 2. Barrel
writeFileSync(
  resolve(root, 'src/index.ts'),
  names.map((name) => `export * from './${name}';`).join('\n') + '\n',
);

// 3. package.json exports map: '.', each component subpath, each raw brand .svg, styles.css
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
// The `development` condition points at source so consuming apps compile @repo/ui straight
// from src in dev (instant HMR). Bundlers resolve `import`/`require` → dist for production.
// Condition order matters: types, then development, then import/require.
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
// Raw brand assets: no module conditions — they're files (URL on import). dev → src, prod → dist.
for (const name of brandSvgs) {
  exportsMap[`./${name}.svg`] = {
    development: `./src/brand/${name}.svg`,
    default: `./dist/${name}.svg`,
  };
}
exportsMap['./styles.css'] = {
  development: './src/styles.css',
  default: './dist/styles.css',
};
// Accessibility metadata (src/a11y/ — see src/a11y/a11y-types.ts and scripts/gen-a11y-catalog.mjs):
// a11y-types.ts is a real (type-only) module, built via a manual vite.config.ts entry (it's not
// at src/ root, so the automatic top-level *.ts glob doesn't pick it up) — the .js/.cjs bundle
// lands flat at dist/ (from that entry), but vite-plugin-dts mirrors source directory structure
// for .d.ts output, so `types` points into dist/a11y/, unlike every other subpath here.
// a11y-catalog.json is generated data, copied verbatim like styles.css (copyAssets plugin).
exportsMap['./a11y-types'] = {
  types: './dist/a11y/a11y-types.d.ts',
  development: './src/a11y/a11y-types.ts',
  import: './dist/a11y-types.js',
  require: './dist/a11y-types.cjs',
};
// wcag-criteria.ts is a real module in src/a11y/ too (referenced by app-side *.a11y.ts sidecars),
// with the same manual vite.config.ts entry and the same dist/a11y/ .d.ts path as a11y-types.
// It must be generated here: it was previously hand-added to package.json, so every gen:entries
// run silently dropped it and broke `@repo/ui/wcag-criteria` for consumers.
exportsMap['./wcag-criteria'] = {
  types: './dist/a11y/wcag-criteria.d.ts',
  development: './src/a11y/wcag-criteria.ts',
  import: './dist/wcag-criteria.js',
  require: './dist/wcag-criteria.cjs',
};
exportsMap['./a11y-catalog.json'] = {
  development: './src/a11y/a11y-catalog.json',
  default: './dist/a11y-catalog.json',
};
pkg.exports = exportsMap;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(
  `Generated ${names.length} component entries + ${brandSvgs.length} raw asset exports + barrel + exports map.`,
);
