import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import {
  connectStages,
  disconnectEdges,
  insertForm,
  insertNode,
  insertStage,
  insertStageBetween,
  nextElementLabel,
} from '../src/studio/layout/flow-edits';
import { removeElement } from '../src/studio/layout/remove-element';
import { validateUischemaDocument } from '../src/studio/code/validate-document';

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
  it("appends 'Stage <n>' holding one untitled Form, with a nanoid(8) id unused by any Stage", () => {
    const ids = createElementIds();
    const root = flow([]);
    const { uischema, inserted } = insertStage(root, null, ids, sequence('s1', 'f1'));
    // Doc 197 rule 4: the Stage's Form is addressable from the start, so it takes the next id. It carries NO
    // label — it reads as "Untitled form" until the author names it (user request 2026-09-18).
    expect(inserted).toEqual({
      type: 'Stage',
      label: 'Stage 1',
      options: { id: 's1' },
      elements: [{ type: 'Form', options: { id: 'f1' }, elements: [] }],
    });
    expect(child(uischema, 0)).toBe(inserted);
    expect(ids.idOf(uischema)).toBe(ids.idOf(root));
    // Doc 203 rule 19: the FIRST Stage of a Flow is stamped as its start, so a flow built from the
    // empty-Flow origin + is never startless. No edge is written here, so startId is all it gains.
    expect(uischema.options).toEqual({ startId: 's1' });
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

  it('numbers a Stage by the highest "Stage <digits>" label + 1, ignoring other labels', () => {
    const root = flow([
      stage('a', 'Stage 2', {}, [form('Form 7'), form('Stage 50')]),
      stage('b', 'Stage 10', {}, [form('Form x')]),
      stage('c', 'Stage x'),
      stage('d', 'Other 99'),
    ]);
    expect(nextElementLabel(root, 'Stage', 'Stage')).toBe('Stage 11');
    // `nextElementLabel` still numbers by type — nothing asks it for a Form label any more.
    expect(nextElementLabel(root, 'Form', 'Form')).toBe('Form 8');
    const { inserted } = insertStage(root, null, createElementIds(), sequence('s'));
    expect(labelOf(inserted)).toBe('Stage 11');
    expect(child(required(inserted, 'stage'), 0)).not.toHaveProperty('label');
  });
});

describe('insertNode appends a Condition (doc 199 rules 20, 24)', () => {
  const conditionAt = (id: string, criteria: object[] = []) =>
    tree({ type: 'Condition', label: 'C', options: { id, criteria } });

  it("appends 'Condition <n>' holding no children, with an empty ROWS list", () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'Stage 1')]);
    const { uischema, inserted } = insertNode(
      root,
      null,
      'condition',
      undefined,
      ids,
      sequence('c1'),
    );
    // A Condition is not a Layout: it has no `elements`, and starts as a legal pass-through (rule 13).
    expect(inserted).toEqual({
      type: 'Condition',
      label: 'Condition 1',
      options: { id: 'c1', rows: [] },
    });
    expect(child(uischema, 1)).toBe(inserted);
  });

  it('takes an id unused by any node, Stage or Condition (rule 15)', () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'A'), conditionAt('b')]);
    // Both ids are taken — the two kinds share ONE id-space — so it regenerates past both.
    const { inserted } = insertNode(
      root,
      null,
      'condition',
      undefined,
      ids,
      sequence('a', 'b', 'c3'),
    );
    expect(inserted?.options).toEqual({ id: 'c3', rows: [] });
  });

  it("carries the criterion as the new edge's sourceHandle (rule 20)", () => {
    const ids = createElementIds();
    const root = flow([conditionAt('c1', [{ id: 'x', field: 'k', operator: 'isEmpty' }])]);
    const { uischema } = insertNode(
      root,
      ids.idOf(child(root, 0)),
      'stage',
      'x',
      ids,
      sequence('s1', 'f1', 'e1'),
    );
    expect(edgesOf(uischema)).toEqual([
      { id: 'e1', source: 'c1', target: 's1', sourceHandle: 'x' },
    ]);
  });

  it('writes NO sourceHandle key for a default-path edge (rule 18)', () => {
    const ids = createElementIds();
    const root = flow([conditionAt('c1')]);
    const { uischema } = insertNode(
      root,
      ids.idOf(child(root, 0)),
      'stage',
      undefined,
      ids,
      sequence('s1', 'f1', 'e1'),
    );
    // ABSENT, never an explicit undefined: absent is precisely what marks the default path.
    expect(edgesOf(uischema)).toEqual([edge('e1', 'c1', 's1')]);
    expect(Object.hasOwn(required(edgesOf(uischema)[0], 'edge') as object, 'sourceHandle')).toBe(
      false,
    );
  });

  it('splits an edge with a Condition, whose downstream half becomes its default path', () => {
    const ids = createElementIds();
    const root = flow([stage('a', 'A'), stage('b', 'B')], [edge('e1', 'a', 'b')]);
    const { uischema, inserted } = insertStageBetween(
      root,
      ids.idOf(root),
      'e1',
      'condition',
      ids,
      sequence('c1', 'e2'),
    );
    expect(inserted?.type).toBe('Condition');
    // The appended half carries no handle, so the Condition is born WITH a default path — no flow problem.
    expect(edgesOf(uischema)).toEqual([edge('e1', 'a', 'c1'), edge('e2', 'c1', 'b')]);
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
      'stage',
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
      'stage',
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
      'stage',
      ids,
      sequence('s', 'f', 'e1', 'e9'),
    );
    expect(edgesOf(uischema)).toEqual([edge('e1', 'a', 's'), edge('e9', 's', 'b')]);
  });

  it('refuses an unknown edge id, a sanitised-away edge, a non-Flow root and a wrong flowId', () => {
    const ids = createElementIds();
    const root = chain();
    const same = { uischema: root, inserted: undefined };
    expect(insertStageBetween(root, ids.idOf(root), 'nope', 'stage', ids, sequence('s'))).toEqual(
      same,
    );
    // The flowId must name the Flow itself: a Stage's id is refused.
    expect(
      insertStageBetween(root, ids.idOf(child(root, 0)), 'e1', 'stage', ids, sequence('s')),
    ).toEqual(same);
    // A self-loop never survives flowEdges, so it cannot be split.
    const looped = flow([stage('a', 'A')], [edge('e1', 'a', 'a')]);
    expect(
      insertStageBetween(looped, ids.idOf(looped), 'e1', 'stage', ids, sequence('s')).inserted,
    ).toBeUndefined();
    const formRoot = tree(form('Root'));
    expect(
      insertStageBetween(formRoot, ids.idOf(formRoot), 'e1', 'stage', ids, sequence('s')),
    ).toEqual({
      uischema: formRoot,
      inserted: undefined,
    });
  });
});

describe('insertForm (rules 19-20)', () => {
  it('appends an untitled Form to the selected Stage and returns the inserted Form', () => {
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

describe('connecting from a Condition row (doc 199 rule 45c)', () => {
  const ids = () => createElementIds();

  it('writes the sourceHandle onto the new edge', () => {
    const store = ids();
    const root = tree({
      type: 'Flow',
      elements: [
        {
          type: 'Condition',
          options: {
            id: 'c',
            rows: [
              {
                id: 'r1',
                label: 'r1',
                match: 'all',
                clauses: [{ id: 'k', field: 'f', operator: 'isTrue' }],
              },
            ],
          },
        },
        { type: 'Stage', options: { id: 't' }, elements: [] },
      ],
      options: { edges: [] },
    });
    const next = connectStages(root, store.idOf(root), 'c', 't', store, () => 'e9', 'r1');
    expect((next as TreeElement).options?.['edges']).toEqual([
      { id: 'e9', source: 'c', target: 't', sourceHandle: 'r1' },
    ]);
  });

  it('leaves the key ABSENT for a handle-less drag, which is what marks the Else path', () => {
    const store = ids();
    const root = tree({
      type: 'Flow',
      elements: [
        { type: 'Stage', options: { id: 'a' }, elements: [] },
        { type: 'Stage', options: { id: 'b' }, elements: [] },
      ],
      options: { edges: [] },
    });
    const next = connectStages(root, store.idOf(root), 'a', 'b', store, () => 'e9');
    expect((next as TreeElement).options?.['edges']).toEqual([
      { id: 'e9', source: 'a', target: 'b' },
    ]);
  });
});

describe('the studio never produces a node its own gate refuses (doc 199 rule 35b)', () => {
  /**
   * The gap that let `criteria` survive: every test asserted the SHAPE the code produced, so renaming the
   * key in the metaschema and missing this one seeding site broke nothing — the studio emitted a Condition
   * the apply gate REFUSED, and no test noticed.
   *
   * Scoped to the node's own SHAPE, not to full validity: a freshly appended Condition is legitimately
   * incomplete until it is wired, because doc 199 requires an Else path, and asserting `valid` here would
   * be asserting that rule away.
   */
  const seeded = () =>
    flow([stage('s1', 'Stage 1', {}, [form('Untitled form')])], []) as UISchemaElement;

  for (const kind of ['condition', 'stage'] as const) {
    it(`appends a ${kind} whose own shape the gate accepts`, () => {
      const ids = createElementIds();
      const root = seeded();
      const { uischema } = insertNode(
        root,
        ids.idOf(child(root, 0)),
        kind,
        undefined,
        ids,
        sequence('n2'),
      );
      // `DocumentCheck` is a UNION: `problems` exists only on the invalid arm, which is why this narrows
      // rather than reaching for the key. An appended Stage takes the valid arm outright.
      const result = validateUischemaDocument(uischema);
      const shapeProblems = result.valid
        ? []
        : result.problems.filter((problem) => problem.message.includes('required property'));
      expect(shapeProblems).toEqual([]);
    });
  }
});
