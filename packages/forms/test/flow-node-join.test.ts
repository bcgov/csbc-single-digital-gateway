import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { joinAroundNode, joinsNeighbours } from '../src/studio/layout/node-join';
import { removeElement } from '../src/studio/layout/remove-element';

// Doc 210 rules 1-8 — deleting a Flow node with exactly one edge in and one out joins its neighbours.

const tree = (element: object) => element as TreeElement;

/** A fresh id registry, for the cases that only assert on the returned edges. */
const newIds = () => createElementIds();
const schema: JsonSchema = { type: 'object', properties: {} };

const stage = (id: string, label = id.toUpperCase()) =>
  tree({
    type: 'Stage',
    label,
    options: { id },
    elements: [{ type: 'Form', options: { id: `f-${id}` }, elements: [] }],
  });

const condition = (id: string, rows: object[] = []) =>
  tree({ type: 'Condition', label: id.toUpperCase(), options: { id, rows } });

const row = (id: string) => ({
  id,
  label: `Row ${id}`,
  match: 'all',
  clauses: [{ id: `cl-${id}`, field: 'x', operator: 'equals', value: 'y' }],
});

const flow = (elements: object[], edges: object[] = [], options: object = {}) =>
  tree({ type: 'Flow', elements, options: { ...options, edges } });

const edge = (id: string, source: string, target: string, sourceHandle?: string) =>
  sourceHandle === undefined ? { id, source, target } : { id, source, target, sourceHandle };

const edgesOf = (element: UISchemaElement) => (element.options?.['edges'] ?? []) as unknown[];

/** Deletes the element with `authoredId` through the real studio path. */
function deleteNode(root: TreeElement, authoredId: string) {
  const ids = createElementIds();
  const node = (root.elements ?? []).find(
    (element) => (element as TreeElement).options?.['id'] === authoredId,
  );
  if (!node) throw new Error(`no node ${authoredId}`);
  return removeElement({ schema, uischema: root }, ids.idOf(node), ids).uischema;
}

describe('joinAroundNode (rules 1-3, 7)', () => {
  it('retargets the incoming edge at the outgoing target, keeping its id, and drops the outgoing edge', () => {
    const ids = createElementIds();
    const root = flow(
      [stage('a'), stage('b'), stage('c')],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
    );
    const next = joinAroundNode(root, 'b', ids);
    expect(edgesOf(next)).toEqual([edge('e1', 'a', 'c')]);
    expect(ids.idOf(next)).toBe(ids.idOf(root));
  });

  it('keeps the incoming edge’s sourceHandle, so a branch leads past the removed node (rule 3)', () => {
    const ids = createElementIds();
    const root = flow(
      [condition('c1', [row('x')]), stage('b'), stage('c')],
      [edge('e1', 'c1', 'b', 'x'), edge('e2', 'b', 'c')],
    );
    expect(edgesOf(joinAroundNode(root, 'b', ids))).toEqual([edge('e1', 'c1', 'c', 'x')]);
  });

  it('preserves the order of untouched edges', () => {
    const ids = createElementIds();
    const root = flow(
      [stage('a'), stage('b'), stage('c'), stage('d')],
      [edge('e0', 'a', 'd'), edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
    );
    expect(edgesOf(joinAroundNode(root, 'b', ids))).toEqual([
      edge('e0', 'a', 'd'),
      edge('e1', 'a', 'c'),
    ]);
  });

  it('returns the SAME object when the node has no edges at all (rule 7)', () => {
    const ids = createElementIds();
    const root = flow([stage('a'), stage('b')], [edge('e1', 'a', 'b')]);
    expect(joinAroundNode(root, 'z', ids)).toBe(root);
  });
});

describe('shapes that do not join (rule 4)', () => {
  it('drops every touching edge when the node has two outgoing edges', () => {
    const root = flow(
      [stage('a'), condition('c1', [row('x')]), stage('b'), stage('c')],
      [edge('e1', 'a', 'c1'), edge('e2', 'c1', 'b', 'x'), edge('e3', 'c1', 'c')],
    );
    expect(edgesOf(joinAroundNode(root, 'c1', newIds()))).toEqual([]);
  });

  it('drops every touching edge when two edges converge on the node', () => {
    const root = flow(
      [stage('a'), stage('b'), stage('t'), stage('c')],
      [edge('e1', 'a', 't'), edge('e2', 'b', 't'), edge('e3', 't', 'c')],
    );
    expect(edgesOf(joinAroundNode(root, 't', newIds()))).toEqual([]);
  });

  it('drops the incoming edge of a leaf, and the outgoing edge of a root', () => {
    const root = flow([stage('a'), stage('b')], [edge('e1', 'a', 'b')]);
    expect(edgesOf(joinAroundNode(root, 'b', newIds()))).toEqual([]);
    expect(edgesOf(joinAroundNode(root, 'a', newIds()))).toEqual([]);
  });
});

describe('joins the connection rules refuse (rules 5-6)', () => {
  it('drops both edges rather than duplicating an edge that already exists', () => {
    const root = flow(
      [stage('a'), stage('b'), stage('c')],
      [edge('e0', 'a', 'c'), edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
    );
    expect(edgesOf(joinAroundNode(root, 'b', newIds()))).toEqual([edge('e0', 'a', 'c')]);
  });

  it('drops both edges rather than occupying a Condition output that already leads somewhere', () => {
    // c1's Else already reaches d; joining a → … would put a second edge on the same output (doc 199 rule 11).
    const root = flow(
      [condition('c1'), stage('b'), stage('c'), stage('d')],
      [edge('e0', 'c1', 'd'), edge('e1', 'c1', 'b'), edge('e2', 'b', 'c')],
    );
    expect(edgesOf(joinAroundNode(root, 'b', newIds()))).toEqual([edge('e0', 'c1', 'd')]);
  });

  it('drops both edges rather than closing a cycle', () => {
    const root = flow([stage('a'), stage('b')], [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')]);
    expect(edgesOf(joinAroundNode(root, 'b', newIds()))).toEqual([]);
  });
});

describe('through removeElement (rules 7-8)', () => {
  it('joins the neighbours when the deleted Stage sits in a chain', () => {
    const root = flow(
      [stage('a'), stage('b'), stage('c')],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
      { startId: 'a' },
    );
    const next = deleteNode(root, 'b');
    expect(edgesOf(next)).toEqual([edge('e1', 'a', 'c')]);
    expect((next as TreeElement).elements).toHaveLength(2);
    expect(next.options?.['startId']).toBe('a');
  });

  it('still clears options.startId when the deleted node was the start, and promotes nobody (rule 8)', () => {
    const root = flow(
      [stage('a'), stage('b'), stage('c')],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
      { startId: 'b' },
    );
    const next = deleteNode(root, 'b');
    expect(edgesOf(next)).toEqual([edge('e1', 'a', 'c')]);
    expect(next.options).not.toHaveProperty('startId');
  });
});

describe('the delete confirmation says what actually happens (rules 8b-8c)', () => {
  it('reports a join for a node in a chain, and no join for a branching one', () => {
    const ids = createElementIds();
    const root = flow(
      [stage('a'), stage('b'), stage('c'), condition('c1', [row('x')]), stage('d'), stage('e')],
      [
        edge('e1', 'a', 'b'),
        edge('e2', 'b', 'c'),
        edge('e3', 'c', 'c1'),
        // c1 branches: one edge by its row, one by its Else output.
        edge('e4', 'c1', 'd', 'x'),
        edge('e5', 'c1', 'e'),
      ],
    );
    void ids;
    expect(joinsNeighbours(root, 'b')).toBe(true);
    // A leaf, and a Condition with two outgoing edges: neither joins (rule 4).
    expect(joinsNeighbours(root, 'd')).toBe(false);
    expect(joinsNeighbours(root, 'c1')).toBe(false);
  });

  it('reports no join when the join itself would be refused (rule 5)', () => {
    const root = flow(
      [stage('a'), stage('b'), stage('c')],
      [edge('e0', 'a', 'c'), edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
    );
    expect(joinsNeighbours(root, 'b')).toBe(false);
  });
});
