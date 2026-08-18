// Aggregates every `<name>.a11y.ts` sidecar in src/a11y/ into a single committed catalog:
// src/a11y/a11y-catalog.json. Each sidecar default-exports an object satisfying
// ComponentA11yMetadata (src/a11y/a11y-types.ts).
// Run after adding/editing a sidecar: `npm run gen:a11y-catalog` (from packages/ui).
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a11yDir = resolve(root, 'src/a11y');

export async function buildCatalog() {
  const paths = readdirSync(a11yDir)
    .filter((f) => f.endsWith('.a11y.ts'))
    .map((f) => resolve(a11yDir, f))
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
  writeFileSync(resolve(a11yDir, 'a11y-catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Generated a11y-catalog.json with ${catalog.length} component(s).`);
}
