import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json';

const root = resolve(import.meta.dirname, '..');
const exportsMap = pkg.exports as Record<string, Record<string, string>>;

describe('renderer submodule exports (doc 236)', () => {
  it('maps ./renderers/ui, ./renderers/default and ./renderers/studio to flat entry files that exist', () => {
    for (const name of ['ui', 'default', 'studio']) {
      const flat = `renderers-${name}`;
      expect(exportsMap[`./renderers/${name}`]).toEqual({
        types: `./dist/${flat}.d.ts`,
        development: `./src/${flat}.ts`,
        import: `./dist/${flat}.js`,
        require: `./dist/${flat}.cjs`,
      });
      const entry = resolve(root, `src/${flat}.ts`);
      expect(existsSync(entry), entry).toBe(true);
      expect(readFileSync(entry, 'utf8')).toBe(`export * from './renderers/${name}/index';\n`);
      expect(existsSync(resolve(root, `src/renderers/${name}/index.ts`))).toBe(true);
    }
  });
});
