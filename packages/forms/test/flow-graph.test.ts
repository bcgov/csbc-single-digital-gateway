import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { drawnStages } from '../src/renderers/xyflow/flow-elements';
import {
  createsCycle,
  CYCLE_MESSAGE,
  DUPLICATE_EDGE_MESSAGE,
  flowEdges,
  flowProblems,
  SELF_LOOP_MESSAGE,
} from '../src/renderers/xyflow/flow-graph';

// Doc 195 rules 5, 8, 10, 18 — the pure Flow graph helpers (renderers/xyflow/flow-elements + flow-graph).

const stage = (id?: unknown, extra: object = {}) =>
  ({
    type: 'Stage',
    elements: [],
    ...(id === undefined ? {} : { options: { id } }),
    ...extra,
  }) as UISchemaElement;

const flow = (elements: readonly UISchemaElement[], edges?: unknown) =>
  ({
    type: 'Flow',
    elements,
    ...(edges === undefined ? {} : { options: { edges } }),
  }) as UISchemaElement;

const edge = (id: string, source: string, target: string) => ({ id, source, target });

const abc = [stage('a'), stage('b'), stage('c')];

describe('drawnStages — stage node ids (rule 8)', () => {
  it("uses a Stage's non-empty string options.id, in elements order, with its index", () => {
    const stages = drawnStages(flow(abc));
    expect(stages.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(stages.map(({ index }) => index)).toEqual([0, 1, 2]);
    expect(stages.every(({ authored }) => authored)).toBe(true);
    expect(stages[1]?.element).toBe(abc[1]);
  });

  it('uses __stage-<index> for a missing, empty or non-string id', () => {
    const stages = drawnStages(flow([stage(), stage(''), stage(7)]));
    expect(stages.map(({ id }) => id)).toEqual(['__stage-0', '__stage-1', '__stage-2']);
    expect(stages.some(({ authored }) => authored)).toBe(false);
  });

  it('uses __stage-<index> for an id already used by an earlier Stage, and skips non-Stage children', () => {
    const heading = { type: 'Heading', text: 'x' } as UISchemaElement;
    const stages = drawnStages(
      flow([stage('a'), heading, stage('a'), stage('__stage-3'), stage()]),
    );
    expect(stages.map(({ id }) => id)).toEqual(['a', '__stage-2', '__stage-3', '__stage-4']);
    expect(stages.map(({ authored }) => authored)).toEqual([true, false, true, false]);
    // A placeholder never collides with an authored id that happens to share its text.
    expect(drawnStages(flow([stage('__stage-1'), stage()])).map(({ id }) => id)).toEqual([
      '__stage-1',
      '__stage-1-2',
    ]);
  });
});

describe('flowEdges (rule 10)', () => {
  it('returns [] when options.edges is absent or not an array', () => {
    expect(flowEdges(flow(abc))).toEqual([]);
    expect(flowEdges(flow(abc, { a: 'b' }))).toEqual([]);
    expect(flowEdges(flow(abc, 'a→b'))).toEqual([]);
  });

  it('keeps valid { id, source, target } edges between drawn Stage ids, in order', () => {
    const edges = [edge('e2', 'b', 'c'), edge('e1', 'a', 'b'), edge('e3', 'a', 'c')];
    expect(flowEdges(flow(abc, edges))).toEqual(edges);
  });

  it('drops entries whose id, source or target is not a string', () => {
    const edges = [null, 'e', { id: 1, source: 'a', target: 'b' }, { id: 'e', source: 'a' }];
    expect(flowEdges(flow(abc, [...edges, edge('ok', 'a', 'b')]))).toEqual([edge('ok', 'a', 'b')]);
  });

  it('drops edges whose source or target is not a drawn Stage id (including __stage-* ids)', () => {
    const stages = [stage('a'), stage('b'), stage()];
    const edges = [
      edge('e1', 'a', 'ghost'),
      edge('e2', 'ghost', 'b'),
      edge('e3', 'a', '__stage-2'),
    ];
    expect(flowEdges(flow(stages, [...edges, edge('e4', 'a', 'b')]))).toEqual([
      edge('e4', 'a', 'b'),
    ]);
  });

  it('drops self-loops', () => {
    expect(flowEdges(flow(abc, [edge('e1', 'a', 'a'), edge('e2', 'a', 'b')]))).toEqual([
      edge('e2', 'a', 'b'),
    ]);
  });

  it('drops a repeated edge id and a repeated (source, target) pair — the first wins', () => {
    const edges = [
      edge('e1', 'a', 'b'),
      edge('e1', 'b', 'c'),
      edge('e2', 'a', 'b'),
      edge('e3', 'b', 'c'),
    ];
    expect(flowEdges(flow(abc, edges))).toEqual([edge('e1', 'a', 'b'), edge('e3', 'b', 'c')]);
  });

  it('keeps edges that form a cycle', () => {
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'a')];
    expect(flowEdges(flow(abc, edges))).toEqual(edges);
  });
});

describe('createsCycle', () => {
  const chain = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')];

  it('is false for an edge that extends an acyclic chain or adds a branch', () => {
    expect(createsCycle(chain, 'c', 'd')).toBe(false);
    expect(createsCycle(chain, 'a', 'c')).toBe(false);
    expect(createsCycle([], 'a', 'b')).toBe(false);
  });

  it('is true for an edge whose target already reaches its source, or a self-loop', () => {
    expect(createsCycle(chain, 'c', 'a')).toBe(true);
    expect(createsCycle(chain, 'b', 'a')).toBe(true);
    expect(createsCycle(chain, 'b', 'b')).toBe(true);
  });
});

describe('flowProblems (rule 18)', () => {
  it('returns [] for a valid branching, acyclic Flow', () => {
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'b', 'c')];
    expect(flowProblems(flow(abc, edges))).toEqual([]);
    expect(flowProblems(flow([]))).toEqual([]);
  });

  it('flags a duplicate Stage id at /elements/<i>/options/id', () => {
    expect(flowProblems(flow([stage('a'), stage('b'), stage('a')]))).toEqual([
      { path: '/elements/2/options/id', message: 'Stage id "a" is already used.' },
    ]);
  });

  it('flags an unknown edge source or target at /options/edges/<i>/source|target', () => {
    expect(flowProblems(flow(abc, [edge('e1', 'a', 'b'), edge('e2', 'x', 'y')]))).toEqual([
      { path: '/options/edges/1/source', message: 'No Stage has id "x".' },
      { path: '/options/edges/1/target', message: 'No Stage has id "y".' },
    ]);
  });

  it('flags a self-loop at /options/edges/<i>', () => {
    expect(flowProblems(flow(abc, [edge('e1', 'b', 'b')]))).toEqual([
      { path: '/options/edges/0', message: SELF_LOOP_MESSAGE },
    ]);
  });

  it('flags a repeated edge id or (source, target) pair as "This edge is already defined."', () => {
    const edges = [edge('e1', 'a', 'b'), edge('e1', 'b', 'c'), edge('e2', 'a', 'b')];
    expect(DUPLICATE_EDGE_MESSAGE).toBe('This edge is already defined.');
    expect(flowProblems(flow(abc, edges))).toEqual([
      { path: '/options/edges/1', message: DUPLICATE_EDGE_MESSAGE },
      { path: '/options/edges/2', message: DUPLICATE_EDGE_MESSAGE },
    ]);
  });

  it('flags the first edge, in order, that closes a cycle', () => {
    const edges = [
      edge('e1', 'a', 'b'),
      edge('e2', 'b', 'c'),
      edge('e3', 'c', 'a'),
      edge('e4', 'a', 'c'),
    ];
    expect(CYCLE_MESSAGE).toBe('This edge would create a cycle.');
    expect(flowProblems(flow(abc, edges))).toEqual([
      { path: '/options/edges/2', message: CYCLE_MESSAGE },
    ]);
  });
});

describe('pure module boundary (rule 5)', () => {
  it('flow-elements, flow-graph and flow-positions import neither @xyflow/react nor react', () => {
    for (const file of ['flow-elements.ts', 'flow-graph.ts', 'flow-positions.ts']) {
      const source = readFileSync(
        resolve(import.meta.dirname, '../src/renderers/xyflow', file),
        'utf8',
      );
      expect(source, file).toMatch(/^import /m);
      expect(source, file).not.toMatch(/from ['"](@xyflow\/react|react|react-dom)['"/]/);
    }
  });
});
