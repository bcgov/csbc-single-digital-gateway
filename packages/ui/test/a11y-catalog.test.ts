import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../scripts/gen-a11y-catalog.mjs';

const catalogPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/a11y/a11y-catalog.json',
);

describe('a11y-catalog.json', () => {
  it('matches what the .a11y.ts sidecars currently produce', async () => {
    const built = await buildCatalog();
    const committed = JSON.parse(readFileSync(catalogPath, 'utf8'));
    expect(built).toEqual(committed);
  });
});
