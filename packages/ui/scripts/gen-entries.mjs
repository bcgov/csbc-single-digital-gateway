// Regenerates the per-component public API from the component sources:
//   - src/components/ui/*.tsx  (shadcn primitives)  and  src/brand/*.tsx  (brand marks)
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

const tsxNames = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.tsx'))
        .map((f) => f.replace(/\.tsx$/, ''))
    : [];

// name -> source dir under src/, used to author the flat re-export target.
const uiNames = tsxNames(uiDir);
const brandNames = tsxNames(brandDir);
const sourceDir = new Map([
  ...uiNames.map((n) => [n, 'components/ui']),
  ...brandNames.map((n) => [n, 'brand']),
]);
const names = [...uiNames, ...brandNames].toSorted();

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
pkg.exports = exportsMap;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(
  `Generated ${names.length} component entries + ${brandSvgs.length} raw asset exports + barrel + exports map.`,
);
