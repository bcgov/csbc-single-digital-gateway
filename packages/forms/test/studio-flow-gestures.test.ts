import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  connectGesture,
  connectionProblem,
  disconnectGesture,
  reconnectGesture,
  reconnectRefusal,
  selectEdgeGesture,
} from '../src/renderers/xyflow/flow-gestures';

// Doc 196 rules 1, 5-7 — pure xyflow callback → FlowGesture translation (renderers/xyflow/flow-gestures).
// The move gesture is retired by doc 198 rules 4-5: positions are derived, so a drag cannot persist.

const el = (element: object) => element as UISchemaElement;
const stage = (id?: string) =>
  el({ type: 'Stage', elements: [], ...(id === undefined ? {} : { id }) });
const flow = (stages: UISchemaElement[], pairs: [string, string][] = []) =>
  el({
    type: 'Flow',
    elements: stages,
    options: { edges: pairs.map(([source, target], i) => ({ id: `e${i}`, source, target })) },
  });

/**
 * Doc 209 rule 14: the port now returns the REASON, and "may connect" is `=== undefined` derived at the call
 * sites. These rule-5 cases are about WHETHER, so they derive it the same way; `edge-edits.test.ts` asserts the
 * reasons themselves.
 */
const canConnect = (...args: Parameters<typeof connectionProblem>) =>
  connectionProblem(...args) === undefined;

describe('canConnect (rule 5)', () => {
  const chain = flow([stage('a'), stage('b'), stage('c')], [['a', 'b']]);

  it('accepts a new edge between two authored Stages that closes no cycle, including a branch', () => {
    expect(canConnect(chain, 'b', 'c')).toBe(true);
    expect(canConnect(chain, 'a', 'c')).toBe(true);
    expect(canConnect(flow([stage('a'), stage('b')]), 'b', 'a')).toBe(true);
  });

  it('refuses a self-loop, a repeated (source, target) pair and a missing end', () => {
    expect(canConnect(chain, 'a', 'a')).toBe(false);
    expect(canConnect(chain, 'a', 'b')).toBe(false);
    expect(canConnect(chain, null, 'b')).toBe(false);
    expect(canConnect(chain, 'a', '')).toBe(false);
    expect(canConnect(chain, 'a', 'ghost')).toBe(false);
  });

  it('refuses an end whose Stage has no authored id', () => {
    const placeholders = flow([stage('a'), stage(), stage('a')]);
    expect(canConnect(placeholders, 'a', '__stage-1')).toBe(false);
    expect(canConnect(placeholders, '__stage-2', 'a')).toBe(false);
  });

  it('refuses an edge that would create a cycle', () => {
    const path = flow(
      [stage('a'), stage('b'), stage('c')],
      [
        ['a', 'b'],
        ['b', 'c'],
      ],
    );
    expect(canConnect(path, 'c', 'a')).toBe(false);
    expect(canConnect(path, 'b', 'a')).toBe(false);
  });
});

describe('connectGesture (rule 6)', () => {
  it("builds { type: 'connect', flowId, source, target } from an xyflow Connection", () => {
    expect(connectGesture('el-1', { source: 'a', target: 'b' })).toEqual({
      type: 'connect',
      flowId: 'el-1',
      source: 'a',
      target: 'b',
    });
  });

  it('returns undefined for a connection with a null source or target', () => {
    expect(connectGesture('el-1', { source: null, target: 'b' })).toBeUndefined();
    expect(connectGesture('el-1', { source: 'a', target: undefined })).toBeUndefined();
    expect(connectGesture('el-1', { source: '', target: 'b' })).toBeUndefined();
  });
});

describe('disconnectGesture (rule 7)', () => {
  it("builds { type: 'disconnect', flowId, edgeIds } from the edges about to be deleted", () => {
    expect(disconnectGesture('el-1', [{ id: 'e1' }, { id: 'e2' }])).toEqual({
      type: 'disconnect',
      flowId: 'el-1',
      edgeIds: ['e1', 'e2'],
    });
  });

  it('returns undefined when no edges are being deleted (nodes are never deleted)', () => {
    expect(disconnectGesture('el-1', [])).toBeUndefined();
  });
});

describe('dragging from a Condition output (doc 199 rule 45c)', () => {
  /** c has rows r1 and r2; only r1 is wired, to `t`. */
  const branched = () =>
    el({
      type: 'Flow',
      elements: [
        el({
          type: 'Condition',
          id: 'c',
          options: {
            rows: ['r1', 'r2'].map((id) => ({
              id,
              label: id,
              match: 'all',
              clauses: [{ id: `cl-${id}`, field: 'f', operator: 'isTrue' }],
            })),
          },
        }),
        stage('t'),
        stage('u'),
      ],
      options: { edges: [{ id: 'e1', source: 'c', target: 't', sourceHandle: 'r1' }] },
    });

  it('carries the row the drag started at, so the edge leaves by THAT branch', () => {
    // Dropped, the edge became the Else path: the row stayed unwired and kept its +, which reads as the drag
    // having done nothing.
    expect(connectGesture('f1', { source: 'c', target: 'u', sourceHandle: 'r2' })).toEqual({
      type: 'connect',
      flowId: 'f1',
      source: 'c',
      target: 'u',
      sourceHandle: 'r2',
    });
  });

  it('stores the Else output and a Stage drag with NO handle at all (rule 18)', () => {
    // The canvas addresses Else by a reserved id; the stored form of a default edge is a handle-less one.
    expect(connectGesture('f1', { source: 'c', target: 'u', sourceHandle: 'else' })).toEqual({
      type: 'connect',
      flowId: 'f1',
      source: 'c',
      target: 'u',
    });
    expect(connectGesture('f1', { source: 'a', target: 'b', sourceHandle: null })).toEqual({
      type: 'connect',
      flowId: 'f1',
      source: 'a',
      target: 'b',
    });
  });

  it('lets a SECOND row lead to a Stage another row already leads to (rule 11)', () => {
    // Two branches meeting at one Stage is ordinary authoring. Comparing (source, target) alone refused it.
    expect(canConnect(branched(), 'c', 't', 'r2')).toBe(true);
  });

  it('still refuses the same row leading to the same Stage twice', () => {
    expect(canConnect(branched(), 'c', 't', 'r1')).toBe(false);
  });

  it('treats the Else output as its own branch for that test', () => {
    const flowEl = branched();
    // Else is unwired, so it may connect...
    expect(canConnect(flowEl, 'c', 't', 'else')).toBe(true);
    // ...and a row's edge does not stand in for it.
    expect(canConnect(flowEl, 'c', 't')).toBe(true);
  });
});

describe('edge gestures (doc 209 rules 2, 15-16, 19)', () => {
  const edge = { id: 'e1' };

  it('reports the edge a batch of changes SELECTS', () => {
    expect(
      selectEdgeGesture('f1', [
        { type: 'select', id: 'e0', selected: false },
        { type: 'select', id: 'e1', selected: true },
      ]),
    ).toEqual({ type: 'select-edge', flowId: 'f1', edgeId: 'e1' });
  });

  it('reports NO edge when the batch only deselects', () => {
    expect(selectEdgeGesture('f1', [{ type: 'select', id: 'e1', selected: false }])).toEqual({
      type: 'select-edge',
      flowId: 'f1',
      edgeId: null,
    });
  });

  it('says NOTHING about a batch that is not a selection (rule 2)', () => {
    // Every layout pass emits changes. Reading those as "nothing is selected" would clear the panel out
    // from under the author.
    expect(selectEdgeGesture('f1', [{ type: 'position', id: 'e1' }])).toBeUndefined();
  });

  it('turns a tip drag into a re-point of the whole connection (rule 19)', () => {
    expect(reconnectGesture('f1', 'e1', { source: 'a', target: 'c', sourceHandle: 'r1' })).toEqual({
      type: 'repoint',
      flowId: 'f1',
      edgeId: 'e1',
      patch: { source: 'a', target: 'c', sourceHandle: 'r1' },
    });
  });

  it('ignores a tip drag released over nothing', () => {
    expect(reconnectGesture('f1', 'e1', { source: 'a', target: null })).toBeUndefined();
  });

  it('re-points anyway when xyflow REFUSED the drop, so the reason gets said (rules 15-16)', () => {
    // `isValidConnection` runs during a reconnect, so a refused drop never reaches `onReconnect` — the edge
    // snapped back in silence. `repointEdge` stays the single judge and produces the message.
    //
    // The anchor is `'source'` here: xyflow reports the handle the edge is still ATTACHED to, so a dragged
    // TARGET arrives as `'source'`. Reading it the other way inverted every refusal (found by hand).
    expect(
      reconnectRefusal('f1', edge, 'source', { isValid: false, toHandle: { nodeId: 'b' } }),
    ).toEqual({ type: 'repoint', flowId: 'f1', edgeId: 'e1', patch: { target: 'b' } });
  });

  it('carries the branch when the SOURCE end moved, and normalises Else', () => {
    expect(
      reconnectRefusal('f1', edge, 'target', {
        isValid: false,
        toHandle: { nodeId: 'c', id: 'else' },
      }),
    ).toEqual({
      type: 'repoint',
      flowId: 'f1',
      edgeId: 'e1',
      patch: { source: 'c', sourceHandle: undefined },
    });
  });

  it('says nothing about a drag released over nothing, or one that landed', () => {
    expect(
      reconnectRefusal('f1', edge, 'source', { isValid: false, toHandle: null }),
    ).toBeUndefined();
    expect(
      reconnectRefusal('f1', edge, 'source', { isValid: true, toHandle: { nodeId: 'b' } }),
    ).toBeUndefined();
  });
});
