// Aggregates every `<name>.catalog.ts` sidecar in src/catalog/ into a single committed catalog:
// src/catalog/component-catalog.json. Each sidecar default-exports an object satisfying
// ComponentUsageMetadata (src/catalog/catalog-types.ts).
//
// This is a structural clone of gen-a11y-catalog.mjs, but an independent pipeline for the
// still-experimental AI-page-building guardrail system — it does not read from or write to
// src/a11y/, so removing this system later never touches the accessibility metadata system.
//
// Run after adding/editing a sidecar: `npm run gen:component-catalog` (from packages/ui).
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalogDir = resolve(root, 'src/catalog');

export async function buildCatalog() {
  const paths = readdirSync(catalogDir)
    .filter((f) => f.endsWith('.catalog.ts'))
    .map((f) => resolve(catalogDir, f))
    .toSorted();
  const entries = await Promise.all(
    paths.map(async (path) => {
      const module = await import(pathToFileURL(path).href);
      return module.default;
    }),
  );
  return entries.toSorted((a, b) => a.component.localeCompare(b.component));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const catalog = await buildCatalog();
  writeFileSync(
    resolve(catalogDir, 'component-catalog.json'),
    JSON.stringify(catalog, null, 2) + '\n',
  );
  console.log(`Generated component-catalog.json with ${catalog.length} component(s).`);
}
