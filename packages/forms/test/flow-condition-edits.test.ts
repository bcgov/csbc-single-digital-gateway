import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { addCriterion, removeCriterion, setCriterion } from '../src/studio/layout/condition-edits';
import { removeElement } from '../src/studio/layout/remove-element';

// Doc 199 rules 25-28 — pure criterion edits. Every changed element is a new object carrying its
// studio id; a refused edit returns the SAME document object.

const tree = (element: object) => element as TreeElement;
const control = (key: string, label?: string) => ({
  type: 'Control',
  scope: `#/properties/${key}`,
  ...(label === undefined ? {} : { label }),
});
const stage = (id: string, controls: object[] = []) => ({
  type: 'Stage',
  options: { id },
  elements: [{ type: 'Form', elements: controls }],
});
const condition = (id: string, criteria: object[] = []) => ({
  type: 'Condition',
  options: { id, criteria },
});
const flow = (elements: object[], edges: object[] = []) =>
  tree({ type: 'Flow', elements, options: { edges } });

const schema: JsonSchema = {
  type: 'object',
  properties: {
    k1: { type: 'string', title: 'Full name' },
    k2: { type: 'number', title: 'Team size' },
    k4: { type: 'string', title: 'Province', oneOf: [{ const: 'bc', title: 'BC' }] },
  },
};

/** A deterministic id source: the given values, then `id-<n>`. */
const sequence = (...values: string[]) => {
  let index = 0;
  return () => values[index++] ?? `id-${index}`;
};

const child = (element: UISchemaElement, index: number) =>
  (element as TreeElement).elements?.[index] as TreeElement;
const criteriaIn = (element: UISchemaElement) =>
  ((element as TreeElement).options?.['criteria'] ?? []) as Record<string, unknown>[];
const edgesIn = (element: UISchemaElement) =>
  ((element as TreeElement).options?.['edges'] ?? []) as Record<string, unknown>[];

/** a → c, where `a` asks k1 (text) and k2 (number). */
const base = (criteria: object[] = [], edges: object[] = []) =>
  flow(
    [stage('a', [control('k1'), control('k2')]), condition('c', criteria), stage('b')],
    [{ id: 'e0', source: 'a', target: 'c' }, ...edges],
  );

describe('addCriterion (rule 26)', () => {
  it('appends a criterion born complete: first upstream field, first operator, a valid value', () => {
    const ids = createElementIds();
    const root = base();
    const next = addCriterion(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      ids,
      sequence('x'),
    );
    expect(criteriaIn(child(next.uischema, 1))).toEqual([
      { id: 'x', field: 'k1', operator: 'equals', value: '' },
    ]);
  });

  it('gives it an id unique within the node, regenerating while taken', () => {
    const ids = createElementIds();
    const root = base([{ id: 'x', field: 'k1', operator: 'equals', value: 'a' }]);
    const next = addCriterion(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      ids,
      sequence('x', 'y'),
    );
    expect(criteriaIn(child(next.uischema, 1)).map(({ id }) => id)).toEqual(['x', 'y']);
  });

  it("uses the field's first choice option as the value for a choice field", () => {
    const ids = createElementIds();
    const root = flow(
      [stage('a', [control('k4')]), condition('c')],
      [{ id: 'e0', source: 'a', target: 'c' }],
    );
    const next = addCriterion(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      ids,
      sequence('x'),
    );
    expect(criteriaIn(child(next.uischema, 1))).toEqual([
      { id: 'x', field: 'k4', operator: 'equals', value: 'bc' },
    ]);
  });

  it('refuses (same document) when the Condition has no upstream fields', () => {
    const ids = createElementIds();
    // No edge reaches the Condition, so nothing has been answered before it.
    const root = flow([stage('a', [control('k1')]), condition('c')]);
    const document = { schema, uischema: root };
    expect(addCriterion(document, ids.idOf(child(root, 1)), ids, sequence('x'))).toBe(document);
  });

  it('refuses for an unknown id or an element that is not a Condition', () => {
    const ids = createElementIds();
    const root = base();
    const document = { schema, uischema: root };
    expect(addCriterion(document, 'el-999', ids, sequence('x'))).toBe(document);
    expect(addCriterion(document, ids.idOf(child(root, 0)), ids, sequence('x'))).toBe(document);
  });

  it('adds no edge — the new output starts unconnected', () => {
    const ids = createElementIds();
    const root = base();
    const next = addCriterion(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      ids,
      sequence('x'),
    );
    expect(edgesIn(next.uischema)).toEqual([{ id: 'e0', source: 'a', target: 'c' }]);
  });
});

describe('removeCriterion (rule 27)', () => {
  const withTwo = () =>
    base(
      [
        { id: 'x', field: 'k1', operator: 'equals', value: 'a' },
        { id: 'y', field: 'k2', operator: 'gt', value: 2 },
      ],
      [
        { id: 'e1', source: 'c', target: 'b', sourceHandle: 'x' },
        { id: 'e2', source: 'c', target: 'b', sourceHandle: 'y' },
        { id: 'e3', source: 'c', target: 'b' },
      ],
    );

  it('drops the criterion and every edge whose (source, sourceHandle) names it', () => {
    const ids = createElementIds();
    const root = withTwo();
    const next = removeCriterion({ schema, uischema: root }, ids.idOf(child(root, 1)), 'x', ids);
    expect(criteriaIn(child(next.uischema, 1)).map(({ id }) => id)).toEqual(['y']);
    expect(edgesIn(next.uischema).map(({ id }) => id)).toEqual(['e0', 'e2', 'e3']);
  });

  it('leaves the default-path edge and other criteria edges untouched', () => {
    const ids = createElementIds();
    const root = withTwo();
    const next = removeCriterion({ schema, uischema: root }, ids.idOf(child(root, 1)), 'y', ids);
    // e3 carries no handle: it is the default path.
    expect(edgesIn(next.uischema).map(({ id }) => id)).toEqual(['e0', 'e1', 'e3']);
  });

  it('returns the same document for an unknown criterion id', () => {
    const ids = createElementIds();
    const root = withTwo();
    const document = { schema, uischema: root };
    expect(removeCriterion(document, ids.idOf(child(root, 1)), 'nope', ids)).toBe(document);
  });
});

describe('setCriterion (rule 28)', () => {
  const withOne = () => base([{ id: 'x', field: 'k1', operator: 'equals', value: 'a' }]);

  it('patches the operator, keeping field and value', () => {
    const ids = createElementIds();
    const root = withOne();
    const next = setCriterion(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      { operator: 'contains' },
      ids,
    );
    expect(criteriaIn(child(next.uischema, 1))).toEqual([
      { id: 'x', field: 'k1', operator: 'contains', value: 'a' },
    ]);
  });

  it('resets operator and value when the new field has a DIFFERENT kind', () => {
    const ids = createElementIds();
    const root = base([{ id: 'x', field: 'k1', operator: 'contains', value: 'a' }]);
    const next = setCriterion(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      { field: 'k2' },
      ids,
    );
    // 'contains' is meaningless for a number, so the operator falls back to that kind's first.
    expect(criteriaIn(child(next.uischema, 1))).toEqual([
      { id: 'x', field: 'k2', operator: 'equals', value: 0 },
    ]);
  });

  it('keeps the criterion id across every patch, so its edges stay attached', () => {
    const ids = createElementIds();
    const root = base(
      [{ id: 'x', field: 'k1', operator: 'equals', value: 'a' }],
      [{ id: 'e1', source: 'c', target: 'b', sourceHandle: 'x' }],
    );
    const next = setCriterion(
      { schema, uischema: root },
      ids.idOf(child(root, 1)),
      'x',
      { field: 'k2' },
      ids,
    );
    expect(criteriaIn(child(next.uischema, 1))[0]?.['id']).toBe('x');
    expect(edgesIn(next.uischema).map(({ id }) => id)).toEqual(['e0', 'e1']);
  });

  it('refuses a patch that would make the criterion invalid', () => {
    const ids = createElementIds();
    const root = withOne();
    const document = { schema, uischema: root };
    const conditionId = ids.idOf(child(root, 1));
    // 'gt' is not a text operator, and a number is not a text value.
    expect(setCriterion(document, conditionId, 'x', { operator: 'gt' }, ids)).toBe(document);
    expect(setCriterion(document, conditionId, 'x', { value: 7 }, ids)).toBe(document);
    // A field that is not upstream cannot be named at all.
    expect(setCriterion(document, conditionId, 'x', { field: 'k4' }, ids)).toBe(document);
  });

  it('returns the same document for an unknown criterion or a non-Condition', () => {
    const ids = createElementIds();
    const root = withOne();
    const document = { schema, uischema: root };
    expect(
      setCriterion(document, ids.idOf(child(root, 1)), 'nope', { operator: 'contains' }, ids),
    ).toBe(document);
    expect(
      setCriterion(document, ids.idOf(child(root, 0)), 'x', { operator: 'contains' }, ids),
    ).toBe(document);
  });
});

describe('removing a Condition (rule 27)', () => {
  it('removes every edge touching it, in both directions', () => {
    const ids = createElementIds();
    const root = base(
      [{ id: 'x', field: 'k1', operator: 'equals', value: 'a' }],
      [
        { id: 'e1', source: 'c', target: 'b', sourceHandle: 'x' },
        { id: 'e2', source: 'c', target: 'b' },
      ],
    );
    const next = removeElement({ schema, uischema: root }, ids.idOf(child(root, 1)), ids);
    expect((next.uischema as TreeElement).elements?.map((element) => element.type)).toEqual([
      'Stage',
      'Stage',
    ]);
    // e0 entered the Condition; e1 and e2 left it.
    expect(edgesIn(next.uischema)).toEqual([]);
  });

  it('drops schema properties no remaining Control uses, like removing a Stage does', () => {
    const ids = createElementIds();
    const root = base();
    const next = removeElement({ schema, uischema: root }, ids.idOf(child(root, 0)), ids);
    expect(Object.keys(next.schema.properties ?? {})).toEqual(['k4']);
  });
});
