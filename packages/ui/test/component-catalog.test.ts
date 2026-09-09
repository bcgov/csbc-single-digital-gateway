import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../scripts/gen-component-catalog.mjs';

const catalogPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/catalog/component-catalog.json',
);

describe('component-catalog.json', () => {
  it('matches what the .catalog.ts sidecars currently produce', async () => {
    const built = await buildCatalog();
    const committed = JSON.parse(readFileSync(catalogPath, 'utf8'));
    expect(built).toEqual(committed);
  });
});
