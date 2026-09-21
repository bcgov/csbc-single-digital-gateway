import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { insertNode, insertStageBetween } from '../src/studio/layout/flow-edits';

// Doc 210 rules 9-15 — an appended Condition is born with a Stage on its Else output.

const tree = (element: object) => element as TreeElement;

const stage = (id: string, label = id.toUpperCase()) =>
  tree({
    type: 'Stage',
    label,
    options: { id },
    elements: [{ type: 'Form', options: { id: `f-${id}` }, elements: [] }],
  });

const flow = (elements: object[], edges: object[] = [], options: object = {}) =>
  tree({ type: 'Flow', elements, options: { ...options, edges } });

const edge = (id: string, source: string, target: string) => ({ id, source, target });

const edgesOf = (element: UISchemaElement) => (element.options?.['edges'] ?? []) as unknown[];
const childrenOf = (element: UISchemaElement) => (element as TreeElement).elements ?? [];

/** A deterministic id source: the given values, then `id-<n>`. */
const sequence = (...values: string[]) => {
  let index = 0;
  return () => values[index++] ?? `id-${index}`;
};

describe('appending a Condition (rules 9-13)', () => {
  it('adds the Condition AND a Stage wired from its Else output, in one edit', () => {
    const ids = createElementIds();
    const root = flow([stage('a')], [], { startId: 'a' });
    const source = childrenOf(root)[0] as TreeElement;

    const { uischema, inserted } = insertNode(
      root,
      ids.idOf(source),
      'condition',
      undefined,
      ids,
      sequence('c1', 'e1', 's1', 'f1', 'e2'),
    );

    const children = childrenOf(uischema);
    expect(children).toHaveLength(3);
    expect(children[1]).toMatchObject({ type: 'Condition', label: 'Condition 1' });
    expect(children[2]).toMatchObject({ type: 'Stage', label: 'Stage 1' });
    // Rule 10: the Else edge carries NO sourceHandle — that is the stored form of the default path.
    const edges = edgesOf(uischema) as Record<string, unknown>[];
    expect(edges).toHaveLength(2);
    expect(edges[0]).toMatchObject({ source: 'a' });
    expect(edges[1]).toMatchObject({ source: edges[0]?.['target'] });
    expect(edges[1]).not.toHaveProperty('sourceHandle');
    // Rule 11: the CONDITION is what becomes the selection.
    expect(inserted).toBe(children[1]);
  });

  it('gives the Else Stage one untitled Form, like any new Stage (rule 13)', () => {
    const ids = createElementIds();
    const root = flow([stage('a')], [], { startId: 'a' });
    const { uischema } = insertNode(
      root,
      ids.idOf(childrenOf(root)[0] as TreeElement),
      'condition',
      undefined,
      ids,
      sequence(),
    );
    const elseStage = childrenOf(uischema)[2] as TreeElement;
    expect(childrenOf(elseStage)).toHaveLength(1);
    expect(childrenOf(elseStage)[0]).toMatchObject({ type: 'Form' });
    expect(childrenOf(elseStage)[0]).not.toHaveProperty('label');
  });

  it('carries the source handle on the INCOMING edge only, when appended from a Condition row', () => {
    const ids = createElementIds();
    const root = flow(
      [stage('a'), tree({ type: 'Condition', label: 'C', options: { id: 'c0', rows: [] } })],
      [edge('e0', 'a', 'c0')],
      { startId: 'a' },
    );
    const source = childrenOf(root)[1] as TreeElement;
    const { uischema } = insertNode(root, ids.idOf(source), 'condition', 'row-x', ids, sequence());
    const edges = edgesOf(uischema) as Record<string, unknown>[];
    expect(edges).toHaveLength(3);
    expect(edges[1]).toMatchObject({ source: 'c0', sourceHandle: 'row-x' });
    expect(edges[2]).not.toHaveProperty('sourceHandle');
  });

  it('never stamps the Else Stage as the Flow start (rule 12)', () => {
    const ids = createElementIds();
    // A startless Flow whose only node is a Condition: the Else Stage must not claim the start.
    const root = flow([tree({ type: 'Condition', label: 'C', options: { id: 'c0', rows: [] } })]);
    const source = childrenOf(root)[0] as TreeElement;
    const { uischema } = insertNode(
      root,
      ids.idOf(source),
      'condition',
      undefined,
      ids,
      sequence(),
    );
    // The Else Stage IS created — it simply never claims the start.
    expect(childrenOf(uischema)).toHaveLength(3);
    expect(childrenOf(uischema)[2]).toMatchObject({ type: 'Stage' });
    expect(uischema.options).not.toHaveProperty('startId');
  });

  it('leaves appending a STAGE unchanged — one element, one edge', () => {
    const ids = createElementIds();
    const root = flow([stage('a')], [], { startId: 'a' });
    const { uischema, inserted } = insertNode(
      root,
      ids.idOf(childrenOf(root)[0] as TreeElement),
      'stage',
      undefined,
      ids,
      sequence(),
    );
    expect(childrenOf(uischema)).toHaveLength(2);
    expect(edgesOf(uischema)).toHaveLength(1);
    expect(inserted).toBe(childrenOf(uischema)[1]);
  });
});

describe('inserting a Condition between two nodes (rule 14)', () => {
  it('adds NO extra Stage — the split edge is already its Else path', () => {
    const ids = createElementIds();
    const root = flow([stage('a'), stage('b')], [edge('e1', 'a', 'b')], { startId: 'a' });
    const { uischema, inserted } = insertStageBetween(
      root,
      ids.idOf(root),
      'e1',
      'condition',
      ids,
      sequence(),
    );
    expect(childrenOf(uischema)).toHaveLength(3);
    expect(edgesOf(uischema)).toHaveLength(2);
    expect(inserted).toMatchObject({ type: 'Condition' });
    // The downstream half leaves the Condition by no handle, which IS the Else path.
    expect((edgesOf(uischema) as Record<string, unknown>[])[1]).not.toHaveProperty('sourceHandle');
  });
});
