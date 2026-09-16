import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import {
  connectStages,
  disconnectEdges,
  insertForm,
  insertStage,
  insertStageBetween,
  nextElementLabel,
} from '../src/studio/layout/flow-edits';
import { removeElement } from '../src/studio/layout/remove-element';

// Doc 196 rules 6-7, 9, 18-20 — pure Flow document edits (studio/layout/flow-edits + remove-element).
// moveStage is retired and no insert writes options.position any more (doc 198 rules 5, 11).

const tree = (element: object) => element as TreeElement;
const form = (label: string, elements: object[] = []) => ({ type: 'Form', label, elements });
const stage = (
  id: string | undefined,
  label: string,
  options: object = {},
  elements = [form('F')],
) =>
  tree({
    type: 'Stage',
    label,
    options: { ...(id === undefined ? {} : { id }), ...options },
    elements,
  });
const flow = (elements: object[], edges?: object[]) =>
  tree({ type: 'Flow', elements, ...(edges ? { options: { edges } } : {}) });
const edge = (id: string, source: string, target: string) => ({ id, source, target });
const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });

/** A deterministic id source: the given values, then `id-<n>`. */
const sequence = (...values: string[]) => {
  let index = 0;
  return () => values[index++] ?? `id-${index}`;
};

const child = (element: UISchemaElement, index: number) =>
  required((element as TreeElement).elements?.[index], `child ${index}`);
const edgesOf = (element: UISchemaElement) => (element.options?.['edges'] ?? []) as unknown[];
const labelOf = (element: UISchemaElement | undefined) => (element as { label?: unknown }).label;

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}

describe('connectStages (rule 6)', () => {
  it('appends { id: nanoid(8), source, target } to options.edges, creating the array when absent', () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'A'), stage('b', 'B')]);
    const next = connectStages(root, ids.idOf(root), 'a', 'b', ids, sequence('e1'));
    expect(edgesOf(next)).toEqual([edge('e1', 'a', 'b')]);
    expect(ids.idOf(next)).toBe(ids.idOf(root));
    expect(root.options).toBeUndefined();
  });

  it('regenerates the edge id while an existing edge has it', () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'A'), stage('b', 'B'), stage('c', 'C')], [edge('e1', 'b', 'c')]);
    const next = connectStages(root, ids.idOf(root), 'a', 'b', ids, sequence('e1', 'e1', 'e2'));
    expect(edgesOf(next)).toEqual([edge('e1', 'b', 'c'), edge('e2', 'a', 'b')]);
  });

  it('refuses (same document) a self-loop, a repeated pair, an unauthored end and a cycle', () => {
    const ids = createElementIds();
    const root = flow(
      [stage('a', 'A'), stage('b', 'B'), stage('c', 'C'), stage(undefined, 'No id')],
      [edge('e1', 'b', 'c')],
    );
    const flowId = ids.idOf(root);
    const connect = (source: string, target: string) =>
      connectStages(root, flowId, source, target, ids, sequence('new'));
    expect(connect('a', 'a')).toBe(root);
    expect(connect('b', 'c')).toBe(root);
    expect(connect('a', '__stage-3')).toBe(root);
    expect(connect('c', 'b')).toBe(root);
    expect(connectStages(root, ids.idOf(child(root, 0)), 'a', 'b', ids, sequence('x'))).toBe(root);
  });
});

describe('disconnectEdges (rule 7)', () => {
  const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'a', 'c')];

  it('removes the edges with the given ids and keeps the rest in order', () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'A'), stage('b', 'B'), stage('c', 'C')], edges);
    const next = disconnectEdges(root, ids.idOf(root), ['e2'], ids);
    expect(edgesOf(next)).toEqual([edge('e1', 'a', 'b'), edge('e3', 'a', 'c')]);
    expect(ids.idOf(next)).toBe(ids.idOf(root));
    expect(edgesOf(root)).toHaveLength(3);
  });

  it('returns the same document when no id matches', () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'A'), stage('b', 'B'), stage('c', 'C')], edges);
    expect(disconnectEdges(root, ids.idOf(root), ['nope'], ids)).toBe(root);
  });
});

describe('removeElement of a Stage (rule 9)', () => {
  const schema: JsonSchema = {
    type: 'object',
    properties: { k1: { type: 'string' }, k2: { type: 'string' } },
    required: ['k2'],
  };
  const build = () =>
    flow(
      [
        stage('a', 'A', {}, [form('FA', [control('k1')])]),
        stage('b', 'B', {}, [form('FB', [control('k2')])]),
        stage('c', 'C'),
        stage(undefined, 'No id'),
      ],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'a', 'c')],
    );

  it('removes every edge touching its authored id without reconnecting neighbours', () => {
    const ids = createElementIds();
    const root = build();
    const next = removeElement({ schema, uischema: root }, ids.idOf(child(root, 1)), ids);
    expect((next.uischema as TreeElement).elements?.map(labelOf)).toEqual(['A', 'C', 'No id']);
    expect(edgesOf(next.uischema)).toEqual([edge('e3', 'a', 'c')]);
    expect(ids.idOf(next.uischema)).toBe(ids.idOf(root));
  });

  it('drops schema properties used only by Controls inside its Forms', () => {
    const ids = createElementIds();
    const root = build();
    const next = removeElement({ schema, uischema: root }, ids.idOf(child(root, 1)), ids);
    expect(Object.keys(next.schema.properties ?? {})).toEqual(['k1']);
    expect(next.schema.required).toBeUndefined();
  });

  it('leaves edges alone when a Form or a Stage with a placeholder id is removed', () => {
    const ids = createElementIds();
    const root = build();
    const withoutForm = removeElement(
      { schema, uischema: root },
      ids.idOf(child(child(root, 0), 0)),
      ids,
    );
    expect(withoutForm.uischema.options).toBe(root.options);
    const withoutPlaceholder = removeElement(
      { schema, uischema: root },
      ids.idOf(child(root, 3)),
      ids,
    );
    expect(edgesOf(withoutPlaceholder.uischema)).toEqual(edgesOf(root));
    expect((withoutPlaceholder.uischema as TreeElement).elements).toHaveLength(3);
  });
});

describe('insertStage (rules 18, 20)', () => {
  it("appends 'Stage <n>' holding one 'Form <m>', with a nanoid(8) id unused by any Stage", () => {
    const ids = createElementIds();
    const root = flow([]);
    const { uischema, inserted } = insertStage(root, null, ids, sequence('s1', 'f1'));
    // Doc 197 rule 4: the Stage's Form is addressable from the start, so it takes the next id.
    expect(inserted).toEqual({
      type: 'Stage',
      label: 'Stage 1',
      options: { id: 's1' },
      elements: [{ type: 'Form', label: 'Form 1', options: { id: 'f1' }, elements: [] }],
    });
    expect(child(uischema, 0)).toBe(inserted);
    expect(ids.idOf(uischema)).toBe(ids.idOf(root));
    expect(uischema.options).toBeUndefined();
    const formRoot = tree(form('Root'));
    expect(insertStage(formRoot, null, ids, sequence('x'))).toEqual({
      uischema: formRoot,
      inserted: undefined,
    });
  });

  it('connects selected → new, writing no position (doc 198 rule 11)', () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'Stage 1'), stage('b', 'Stage 2')]);
    const { uischema, inserted } = insertStage(
      root,
      ids.idOf(child(root, 0)),
      ids,
      // 'a' is taken, so the Stage regenerates to 's3'; then the Stage's Form takes 'f3' and the edge 'e1'.
      sequence('a', 's3', 'f3', 'e1'),
    );
    expect(inserted?.options).toEqual({ id: 's3' });
    expect(labelOf(inserted)).toBe('Stage 3');
    expect(edgesOf(uischema)).toEqual([edge('e1', 'a', 's3')]);
  });

  it('does not connect from a selected Stage without an authored id', () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'A'), stage(undefined, 'No id')]);
    const { uischema, inserted } = insertStage(root, ids.idOf(child(root, 1)), ids, sequence('s'));
    expect(inserted?.options).toEqual({ id: 's' });
    expect(uischema.options).toBeUndefined();
  });

  it('never writes options.position, whatever is selected (doc 198 rule 11)', () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'A'), stage('b', 'B')]);
    const selectedForm = ids.idOf(child(child(root, 0), 0));
    expect(insertStage(root, null, ids, sequence('n')).inserted?.options).toEqual({ id: 'n' });
    // A selected Form is not a selected Stage.
    expect(insertStage(root, selectedForm, ids, sequence('m')).uischema.options).toBeUndefined();
    expect(insertStage(flow([]), null, ids, sequence('o')).inserted?.options).toEqual({ id: 'o' });
  });

  it('numbers by the highest "Stage <digits>" / "Form <digits>" label + 1, ignoring other labels', () => {
    const root = flow([
      stage('a', 'Stage 2', {}, [form('Form 7'), form('Stage 50')]),
      stage('b', 'Stage 10', {}, [form('Form x')]),
      stage('c', 'Stage x'),
      stage('d', 'Other 99'),
    ]);
    expect(nextElementLabel(root, 'Stage', 'Stage')).toBe('Stage 11');
    expect(nextElementLabel(root, 'Form', 'Form')).toBe('Form 8');
    const { inserted } = insertStage(root, null, createElementIds(), sequence('s'));
    expect(labelOf(inserted)).toBe('Stage 11');
    expect(child(required(inserted, 'stage'), 0)).toMatchObject({ label: 'Form 8' });
  });
});

describe('insertStageBetween (doc 198 rule 10)', () => {
  const chain = () => flow([stage('a', 'Stage 1'), stage('b', 'Stage 2')], [edge('e1', 'a', 'b')]);

  it('retargets the split edge at the new Stage and appends new → oldTarget', () => {
    const ids = createElementIds();
    const root = chain();
    const { uischema, inserted } = insertStageBetween(
      root,
      ids.idOf(root),
      'e1',
      ids,
      sequence('s3', 'f3', 'e2'),
    );
    expect(inserted?.options).toEqual({ id: 's3' });
    expect(labelOf(inserted)).toBe('Stage 3');
    // The upstream edge KEEPS its id across the split; the downstream Stage is never orphaned.
    expect(edgesOf(uischema)).toEqual([edge('e1', 'a', 's3'), edge('e2', 's3', 'b')]);
    expect(ids.idOf(uischema)).toBe(ids.idOf(root));
  });

  it('leaves every other edge untouched', () => {
    const ids = createElementIds();
    const root = flow(
      [stage('a', 'A'), stage('b', 'B'), stage('c', 'C')],
      [edge('e1', 'a', 'b'), edge('e2', 'a', 'c')],
    );
    const { uischema } = insertStageBetween(
      root,
      ids.idOf(root),
      'e2',
      ids,
      sequence('s', 'f', 'e3'),
    );
    expect(edgesOf(uischema)).toEqual([
      edge('e1', 'a', 'b'),
      edge('e2', 'a', 's'),
      edge('e3', 's', 'c'),
    ]);
  });

  it('regenerates the appended edge id while an existing edge has it', () => {
    const ids = createElementIds();
    const root = chain();
    const { uischema } = insertStageBetween(
      root,
      ids.idOf(root),
      'e1',
      ids,
      sequence('s', 'f', 'e1', 'e9'),
    );
    expect(edgesOf(uischema)).toEqual([edge('e1', 'a', 's'), edge('e9', 's', 'b')]);
  });

  it('refuses an unknown edge id, a sanitised-away edge, a non-Flow root and a wrong flowId', () => {
    const ids = createElementIds();
    const root = chain();
    const same = { uischema: root, inserted: undefined };
    expect(insertStageBetween(root, ids.idOf(root), 'nope', ids, sequence('s'))).toEqual(same);
    // The flowId must name the Flow itself: a Stage's id is refused.
    expect(insertStageBetween(root, ids.idOf(child(root, 0)), 'e1', ids, sequence('s'))).toEqual(
      same,
    );
    // A self-loop never survives flowEdges, so it cannot be split.
    const looped = flow([stage('a', 'A')], [edge('e1', 'a', 'a')]);
    expect(
      insertStageBetween(looped, ids.idOf(looped), 'e1', ids, sequence('s')).inserted,
    ).toBeUndefined();
    const formRoot = tree(form('Root'));
    expect(insertStageBetween(formRoot, ids.idOf(formRoot), 'e1', ids, sequence('s'))).toEqual({
      uischema: formRoot,
      inserted: undefined,
    });
  });
});

describe('insertForm (rules 19-20)', () => {
  it("appends 'Form <n>' to the selected Stage and returns the inserted Form", () => {
    const ids = createElementIds();
    const root = flow([
      stage('a', 'A', {}, [form('Form 1')]),
      stage('b', 'B', {}, [form('Form 3')]),
    ]);
    const b = child(root, 1);
    const { uischema, inserted } = insertForm(root, ids.idOf(b), ids, sequence('f4'));
    // Doc 197 rule 4: an inserted Form is addressable from the start.
    expect(inserted).toEqual({
      type: 'Form',
      label: 'Form 4',
      options: { id: 'f4' },
      elements: [],
    });
    expect(child(child(uischema, 1), 1)).toBe(inserted);
    expect(ids.idOf(child(uischema, 1))).toBe(ids.idOf(b));
    expect(child(uischema, 0)).toBe(child(root, 0));
  });

  it('returns the same document when the selection is not a Stage', () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'A')]);
    for (const selected of [null, ids.idOf(root), ids.idOf(child(child(root, 0), 0)), 'el-999']) {
      expect(insertForm(root, selected, ids, sequence('f1'))).toEqual({
        uischema: root,
        inserted: undefined,
      });
    }
  });
});
