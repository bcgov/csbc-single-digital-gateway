import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildExportsMap,
  buildFlatEntry,
  discoverSubmodules,
  flatEntryName,
  hasStyles,
} from '../scripts/gen-entries.mjs';

// Doc 180 — nested submodule discovery + flat entry naming in scripts/gen-entries.mjs.

const fixtures: string[] = [];

/** A throwaway package root whose src/ holds exactly the given files (paths relative to src/). */
function fixture(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'forms-gen-entries-'));
  fixtures.push(root);
  mkdirSync(join(root, 'src'));
  for (const file of files) {
    const path = join(root, 'src', file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, '');
  }
  return root;
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('gen-entries discoverSubmodules', () => {
  it('treats a directory with an index.ts(x) as a submodule and does not search inside it', () => {
    const root = fixture(['studio/index.ts', 'studio/inner/index.ts', 'panel/index.tsx']);
    expect(discoverSubmodules(root)).toEqual(['panel', 'studio']);
    expect(discoverSubmodules(root)).not.toContain('studio/inner');
  });

  it('treats an index-less directory as a namespace and discovers its indexed children as ns/child', () => {
    const root = fixture([
      'renderers/ui/index.ts',
      'renderers/studio/index.ts',
      'renderers/shared/helpers.ts',
      'renderers/deep/nested/index.ts',
    ]);
    expect(discoverSubmodules(root)).toEqual([
      'renderers/deep/nested',
      'renderers/studio',
      'renderers/ui',
    ]);
    expect(discoverSubmodules(root)).not.toContain('renderers');
    expect(discoverSubmodules(root)).not.toContain('renderers/shared');
  });

  it('never treats the top-level src/types directory as a submodule', () => {
    const root = fixture(['types/index.ts', 'studio/index.ts', 'renderers/types/index.ts']);
    expect(discoverSubmodules(root)).not.toContain('types');
    expect(discoverSubmodules(root)).toContain('studio');
    // Only the TOP-level types dir is reserved; a nested one is an ordinary submodule.
    expect(discoverSubmodules(root)).toContain('renderers/types');
  });

  it('returns submodule names sorted', () => {
    const root = fixture(['zeta/index.ts', 'alpha/index.ts', 'renderers/beta/index.ts']);
    const names = discoverSubmodules(root);
    expect(names).toEqual(['alpha', 'renderers/beta', 'zeta']);
    expect(names).toEqual(names.toSorted());
  });
});

describe('gen-entries flat entry naming', () => {
  it("maps subpath 'renderers/ui' to the flat entry name 'renderers-ui'", () => {
    expect(flatEntryName('renderers/ui')).toBe('renderers-ui');
    expect(flatEntryName('studio')).toBe('studio');
    expect(flatEntryName('a/b/c')).toBe('a-b-c');
  });

  it("builds a flat entry for 'renderers/ui' that re-exports './renderers/ui/index'", () => {
    expect(buildFlatEntry('renderers/ui')).toBe("export * from './renderers/ui/index';\n");
    expect(buildFlatEntry('studio')).toBe("export * from './studio/index';\n");
  });

  it('throws when two submodules map to the same flat entry name', () => {
    const root = fixture(['renderers-ui/index.ts', 'renderers/ui/index.ts']);
    expect(() => discoverSubmodules(root)).toThrow(/renderers-ui/);
    expect(() => discoverSubmodules(root)).toThrow(/both flatten/);
  });

  it("throws when a submodule maps to the reserved flat name 'index'", () => {
    const root = fixture(['index/index.ts']);
    expect(() => discoverSubmodules(root)).toThrow(/reserved entry name "index"/);
  });
});

describe('gen-entries buildExportsMap', () => {
  it('keys a nested submodule as ./renderers/ui with every condition pointing at renderers-ui files', () => {
    const map = buildExportsMap(['renderers/ui']);
    expect(map['./renderers/ui']).toEqual({
      types: './dist/renderers-ui.d.ts',
      development: './src/renderers-ui.ts',
      import: './dist/renderers-ui.js',
      require: './dist/renderers-ui.cjs',
    });
    expect(Object.keys(map)).toEqual(['.', './renderers/ui']);
  });

  it('emits a static ./styles.css export { development: src, default: dist } when src/styles.css exists', () => {
    const root = fixture(['styles.css', 'studio/index.ts']);
    expect(hasStyles(root)).toBe(true);
    const map = buildExportsMap(discoverSubmodules(root), { styles: hasStyles(root) });
    expect(map['./styles.css']).toEqual({
      development: './src/styles.css',
      default: './dist/styles.css',
    });
  });

  it('omits ./styles.css when src/styles.css does not exist', () => {
    const root = fixture(['studio/index.ts']);
    expect(hasStyles(root)).toBe(false);
    const map = buildExportsMap(discoverSubmodules(root), { styles: hasStyles(root) });
    expect(map).not.toHaveProperty(['./styles.css']);
    expect(Object.keys(map)).toEqual(['.', './studio']);
  });
});
