import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { TreeElement } from '../src/studio/layout/element-tree';

// Shared fixtures for the Condition edit tests (doc 199 rules 25-28, 46, 48-49).

export const tree = (element: object) => element as TreeElement;
export const control = (key: string, label?: string) => ({
  type: 'Control',
  scope: `#/properties/${key}`,
  ...(label === undefined ? {} : { label }),
});
export const stage = (id: string, controls: object[] = []) => ({
  type: 'Stage',
  options: { id },
  elements: [{ type: 'Form', elements: controls }],
});
export const condition = (id: string, rows: object[] = []) => ({
  type: 'Condition',
  options: { id, rows },
});
export const flow = (elements: object[], edges: object[] = []) =>
  tree({ type: 'Flow', elements, options: { edges } });

/** A one-clause row, which is the shape every pre-rows fixture had (rule 35). */
export const row = (id: string, clause: object, patch: object = {}) => ({
  id,
  label: `Condition ${id}`,
  match: 'all',
  clauses: [clause],
  ...patch,
});

export const schema: JsonSchema = {
  type: 'object',
  properties: {
    k1: { type: 'string', title: 'Full name' },
    k2: { type: 'number', title: 'Team size' },
    k4: { type: 'string', title: 'Province', oneOf: [{ const: 'bc', title: 'BC' }] },
  },
};

/** A deterministic id source: the given values, then `id-<n>`. */
export const sequence = (...values: string[]) => {
  let index = 0;
  return () => values[index++] ?? `id-${index}`;
};

export const child = (element: UISchemaElement, index: number) =>
  (element as TreeElement).elements?.[index] as TreeElement;
export const rowsIn = (element: UISchemaElement) =>
  ((element as TreeElement).options?.['rows'] ?? []) as Record<string, unknown>[];
export const clausesIn = (element: UISchemaElement, index = 0) =>
  (rowsIn(element)[index]?.['clauses'] ?? []) as Record<string, unknown>[];
export const edgesIn = (element: UISchemaElement) =>
  ((element as TreeElement).options?.['edges'] ?? []) as Record<string, unknown>[];

/** a → c, where `a` asks k1 (text) and k2 (number). */
export const base = (rows: object[] = [], edges: object[] = []) =>
  flow(
    [stage('a', [control('k1'), control('k2')]), condition('c', rows), stage('b')],
    [{ id: 'e0', source: 'a', target: 'c' }, ...edges],
  );

/** Doc 209: an edge entry, as `options.edges` stores one. Spread to add a `sourceHandle`. */
export const edge = (id: string, source: string, target: string) => ({ id, source, target });
