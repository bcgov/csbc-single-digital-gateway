import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Doc 222 — `@repo/forms/capabilities` runs inside platform-api, a Nest process with no React and no
// DOM. `checkCapabilities` decides whether a change was permitted by reading the SAME
// `InspectorField` definitions the studio's inspector renders from (doc 220: `edit` names field
// keys, not element keys), so the inspector's field definitions are reachable from the server too.
//
// That property is invisible at the call site and breaks from a distance: a `createContext` added to
// a pure options module three imports away is enough. `tabs-options.ts` is the proof — its header
// read "Pure — no gridstack, no React" for two features while it imported `createContext`, and
// nothing failed, because every consumer at the time was a React file.
//
// So this walks the real import graph rather than grepping a hand-listed set of files: the whole
// point is catching the import nobody thought to list.

const SRC = resolve(import.meta.dirname, '../src');

const resolveLocal = (from: string, spec: string) => {
  const base = resolve(dirname(from), spec);
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((path) =>
    existsSync(path),
  );
};

/** Every module reachable from `entry`, plus the external packages imported for their VALUES. */
function importGraph(entry: string) {
  const local = new Set<string>();
  const runtime = new Map<string, string[]>();
  const queue = [resolve(SRC, entry)];

  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || local.has(file)) continue;
    local.add(file);

    // Re-exports are edges too: a barrel is all `export … from`, so matching only `import` walks
    // one module and reports a clean graph. `import type` / `export type` are erased under
    // `verbatimModuleSyntax`, so a type-only import of a React package costs the server nothing —
    // only value imports are load-bearing here.
    for (const match of readFileSync(file, 'utf8').matchAll(
      /^(?:import|export)([^;]*?)from '([^']+)'/gm,
    )) {
      const [, clause, spec] = match as unknown as [string, string, string];
      const target = resolveLocal(file, spec);
      if (target !== undefined) queue.push(target);
      else if (!clause.trimStart().startsWith('type'))
        runtime.set(spec, [...(runtime.get(spec) ?? []), relative(SRC, file)]);
    }
  }
  return { local: [...local].map((path) => relative(SRC, path)), runtime };
}

// React itself, the React UI kit, and the two DOM-only rendering libraries. Reaching any of these
// from the server entry points is the regression this guards.
const BROWSER_ONLY = /^(react|react-dom|@repo\/ui|@repo\/ui\/|@jsonforms\/react|gridstack|@xyflow)/;

describe.each([
  ['capabilities/index.ts', 'the public capabilities submodule'],
  ['studio/inspector/inspector-fields.ts', 'the inspector field definitions it reads'],
])('%s — %s', (entry) => {
  const { local, runtime } = importGraph(entry);

  it('imports no browser-only package for its values, however deep', () => {
    const offenders = [...runtime]
      .filter(([spec]) => BROWSER_ONLY.test(spec))
      .map(([spec, importers]) => `${spec} <- ${importers.join(', ')}`);
    expect(offenders).toEqual([]);
  });

  it('reaches no .tsx module at all', () => {
    expect(local.filter((path) => path.endsWith('.tsx'))).toEqual([]);
  });

  it('actually walked the graph, so an empty result is never a false pass', () => {
    expect(local.length).toBeGreaterThan(3);
    expect(local).toContain(entry);
  });
});
