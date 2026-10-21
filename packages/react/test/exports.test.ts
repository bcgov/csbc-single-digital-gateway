import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json';

/**
 * Guards the generated public API of `@repo/react` — the flat entry files, the barrel and the
 * `package.json` `exports` map, all written by `scripts/gen-entries.mjs`.
 *
 * `@repo/ui` and `@repo/forms` have had this guard for a while; this package did not, so a stale
 * `exports` map (the script not re-run after adding or removing a module) went uncaught. Feature
 * 217, which removed five of the package's six modules, is exactly the shape of change it catches.
 */
const root = resolve(import.meta.dirname, '..');
const srcDir = resolve(root, 'src');
const exportsMap = pkg.exports as Record<string, Record<string, string>>;

/** A "module" is a directory under src/ with an index.ts — the same rule the script applies. */
const modules = readdirSync(srcDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(resolve(srcDir, entry.name, 'index.ts')))
  .map((entry) => entry.name)
  .toSorted();

describe('@repo/react exports map', () => {
  it('exports the root plus exactly one subpath per module on disk', () => {
    expect(Object.keys(exportsMap).toSorted()).toEqual(
      ['.', ...modules.map((name) => `./${name}`)].toSorted(),
    );
  });

  it('gives every subpath a dev (source) + prod (dist) condition', () => {
    for (const [key, value] of Object.entries(exportsMap)) {
      expect(value, key).toMatchObject({
        types: expect.stringContaining('./dist/'),
        development: expect.stringContaining('./src/'),
        import: expect.stringContaining('./dist/'),
        require: expect.stringContaining('./dist/'),
      });
    }
  });

  it('orders conditions types, development, import, require', () => {
    // Order is significant to resolvers: `development` must be offered before `import`/`require`
    // so a dev server takes source over dist (feature 06).
    for (const [key, value] of Object.entries(exportsMap)) {
      expect(Object.keys(value), key).toEqual(['types', 'development', 'import', 'require']);
    }
  });

  it('has a generated flat entry file for every exported subpath', () => {
    for (const name of modules) {
      const entry = resolve(srcDir, `${name}.ts`);
      expect(existsSync(entry), `src/${name}.ts must exist`).toBe(true);
      expect(readFileSync(entry, 'utf8')).toBe(`export * from './${name}/index';\n`);
    }
  });

  it('leaves NO orphaned flat entry — a src/<name>.ts with no src/<name>/ beside it', () => {
    // The script used to write entries but never remove them, so deleting a module left its entry
    // behind and the barrel kept re-exporting a directory that was gone.
    const orphans = readdirSync(srcDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'index.ts')
      .map((entry) => entry.name.slice(0, -'.ts'.length))
      .filter((name) => !modules.includes(name));

    expect(orphans).toEqual([]);
  });

  it('keeps the barrel in step with the modules on disk', () => {
    expect(readFileSync(resolve(srcDir, 'index.ts'), 'utf8')).toBe(
      modules.map((name) => `export * from './${name}';`).join('\n') + '\n',
    );
  });

  it('carries only the dependencies the remaining modules need', () => {
    // Feature 217 removed the JSONForms modules; notification-center needs @mdi/*, @repo/ui and
    // React alone, so nothing JSONForms-, dnd-kit- or Ajv-shaped should be left behind.
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

    expect(deps.filter((name) => name.startsWith('@jsonforms/'))).toEqual([]);
    expect(deps.filter((name) => name.startsWith('@dnd-kit/'))).toEqual([]);
    expect(deps).not.toContain('ajv');
  });
});
