import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { drawnStages } from '../src/renderers/xyflow/flow-elements';
import { DEFAULT_HANDLE } from '../src/renderers/xyflow/flow-elements';
import {
  createsCycle,
  CYCLE_MESSAGE,
  duplicateStageIdMessage,
  DUPLICATE_EDGE_MESSAGE,
  flowEdges,
  flowProblems,
  leafStageIds,
  MISSING_DEFAULT_MESSAGE,
  SELF_LOOP_MESSAGE,
  unknownHandleMessage,
} from '../src/renderers/xyflow/flow-graph';

// Doc 195 rules 5, 8, 10, 18 — the pure Flow graph helpers (renderers/xyflow/flow-elements + flow-graph).

const stage = (id?: unknown, extra: object = {}) =>
  ({
    type: 'Stage',
    elements: [],
    ...(id === undefined ? {} : { id }),
    ...extra,
    // Doc 219: `id` is typed `string` on the element, and this helper deliberately passes bad values.
  }) as unknown as UISchemaElement;

const flow = (elements: readonly UISchemaElement[], edges?: unknown) =>
  ({
    type: 'Flow',
    elements,
    ...(edges === undefined ? {} : { options: { edges } }),
  }) as UISchemaElement;

const edge = (id: string, source: string, target: string) => ({ id, source, target });

const abc = [stage('a'), stage('b'), stage('c')];

// Doc 199 fixtures (rules 35, 37). A ROW's id is the sourceHandle of the edge leaving it; the clause inside it
// is one test, addressed by nothing.
const clause = (rowId: string) => ({
  id: `${rowId}-clause`,
  field: 'k1',
  operator: 'equals',
  value: 'x',
});
const row = (id: string, index: number) => ({
  id,
  label: `Condition ${index + 1}`,
  match: 'all',
  clauses: [clause(id)],
});
const condition = (id: string, rows: string[] = []) =>
  ({
    type: 'Condition',
    id,
    options: { rows: rows.map(row) },
  }) as UISchemaElement;
const branch = (id: string, source: string, target: string, sourceHandle: string) => ({
  id,
  source,
  target,
  sourceHandle,
});
const hasHandle = (value: object) => Object.hasOwn(value, 'sourceHandle');

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

// Doc 198 rule 6 — a leaf is a drawn, authored Stage with no outgoing sanitised edge. It is what the
// dangling + affordance (rule 7) hangs off.
describe('leafStageIds (doc 198 rule 6)', () => {
  it('returns every authored Stage when the Flow has no edges', () => {
    expect(leafStageIds(flow(abc))).toEqual(['a', 'b', 'c']);
  });

  it('excludes a Stage with an outgoing edge, keeping the end of a chain', () => {
    expect(leafStageIds(flow(abc, [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')]))).toEqual(['c']);
  });

  it('returns every leaf when the Flow branches', () => {
    expect(leafStageIds(flow(abc, [edge('e1', 'a', 'b'), edge('e2', 'a', 'c')]))).toEqual([
      'b',
      'c',
    ]);
  });

  it('ignores sanitised-away edges — a self-loop or unknown target leaves a Stage a leaf', () => {
    expect(leafStageIds(flow(abc, [edge('e1', 'b', 'b'), edge('e2', 'c', 'ghost')]))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('excludes a Stage with no authored id — no edge can leave it', () => {
    expect(leafStageIds(flow([stage('a'), stage()]))).toEqual(['a']);
  });

  it('returns [] for a Flow with no Stages', () => {
    expect(leafStageIds(flow([]))).toEqual([]);
  });

  it('returns leaves in elements order', () => {
    const stages = [stage('c'), stage('a'), stage('b')];
    expect(leafStageIds(flow(stages, [edge('e1', 'a', 'b')]))).toEqual(['c', 'b']);
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

// Doc 199 rules 10-15 — the graph learns about Conditions and branch handles. Rules 10 and 11 fix
// two PRE-EXISTING sanitiser bugs: asEdge dropped unknown keys, and pairKey made two criteria
// leading to the same Stage look like duplicates.
describe('sourceHandle survives the sanitiser (doc 199 rule 10)', () => {
  const branched = (edges: unknown[]) => flow([condition('c', ['x', 'y']), stage('b')], edges);

  it('carries a non-empty string sourceHandle through flowEdges', () => {
    expect(flowEdges(branched([branch('e1', 'c', 'b', 'x')]))).toEqual([
      { id: 'e1', source: 'c', target: 'b', sourceHandle: 'x' },
    ]);
  });

  it('leaves sourceHandle absent — never undefined — when it is missing or not a string', () => {
    const [plain] = flowEdges(flow(abc, [edge('e1', 'a', 'b')]));
    expect(plain).toEqual(edge('e1', 'a', 'b'));
    expect(hasHandle(plain ?? {})).toBe(false);

    for (const bad of [7, '', null, {}]) {
      const [only] = flowEdges(
        branched([{ id: 'e1', source: 'c', target: 'b', sourceHandle: bad }]),
      );
      expect(hasHandle(only ?? {}), String(bad)).toBe(false);
    }
  });

  it('normalises the reserved __default handle to an absent key', () => {
    // xyflow reports '__default' when the author drags from the default handle; the stored form of a
    // default edge is no handle at all, so the two can never disagree.
    const [only] = flowEdges(branched([branch('e1', 'c', 'b', DEFAULT_HANDLE)]));
    expect(only).toEqual(edge('e1', 'c', 'b'));
    expect(hasHandle(only ?? {})).toBe(false);
  });

  it('drops an edge whose sourceHandle names no criterion of its source', () => {
    expect(flowEdges(branched([branch('e1', 'c', 'b', 'nope')]))).toEqual([]);
  });
});

describe('duplicate identity includes the handle (doc 199 rule 11)', () => {
  const branched = (edges: unknown[]) => flow([condition('c', ['x', 'y']), stage('b')], edges);

  it('keeps two edges from one Condition to the SAME target under different handles', () => {
    // Two criteria leading to one Stage is ordinary authoring - without the handle in the key the
    // second would read as a duplicate and be dropped.
    expect(
      flowEdges(branched([branch('e1', 'c', 'b', 'x'), branch('e2', 'c', 'b', 'y')])).map(
        ({ id }) => id,
      ),
    ).toEqual(['e1', 'e2']);
  });

  it('still drops a genuinely repeated (source, sourceHandle, target)', () => {
    expect(
      flowEdges(branched([branch('e1', 'c', 'b', 'x'), branch('e2', 'c', 'b', 'x')])).map(
        ({ id }) => id,
      ),
    ).toEqual(['e1']);
  });

  it('is unchanged for Stage edges, which carry no handle', () => {
    expect(flowEdges(flow(abc, [edge('e1', 'a', 'b'), edge('e2', 'a', 'b')]))).toEqual([
      edge('e1', 'a', 'b'),
    ]);
  });
});

// Rule 13's other half - is each criterion valid, and is its field upstream? - needs the document's
// SCHEMA, which flowProblems is never given, so it lives in the studio-side check instead.
describe('Condition problems (doc 199 rules 12-15)', () => {
  it('reports an edge whose sourceHandle names no criterion of its source', () => {
    const root = flow([condition('c', ['x']), stage('b')], [branch('e1', 'c', 'b', 'nope')]);
    expect(flowProblems(root)).toContainEqual({
      path: '/options/edges/0/sourceHandle',
      message: unknownHandleMessage('nope'),
    });
  });

  it('reports a Condition with no default path, at the node', () => {
    const root = flow([condition('c', ['x']), stage('b')], [branch('e1', 'c', 'b', 'x')]);
    expect(flowProblems(root)).toEqual([{ path: '/elements/0', message: MISSING_DEFAULT_MESSAGE }]);
  });

  it('accepts a Condition with a default and no criteria at all', () => {
    // A pass-through: legal, just not yet branching.
    expect(flowProblems(flow([condition('c'), stage('b')], [edge('e1', 'c', 'b')]))).toEqual([]);
  });

  it('accepts a Condition with both a criterion edge and a default', () => {
    const root = flow(
      [condition('c', ['x']), stage('b'), stage('d')],
      [branch('e1', 'c', 'b', 'x'), edge('e2', 'c', 'd')],
    );
    expect(flowProblems(root)).toEqual([]);
  });

  it('reports an id duplicated between a Stage and a Condition (rule 15)', () => {
    expect(flowProblems(flow([stage('a'), condition('a')]))).toContainEqual({
      path: '/elements/1/options/id',
      message: duplicateStageIdMessage('a'),
    });
  });

  it('never reports a Condition as a leaf (rule 14)', () => {
    // 'c' has no outgoing edge, but a Condition owns its outputs on its card instead.
    const root = flow([stage('a'), condition('c')], [edge('e1', 'a', 'c')]);
    expect(leafStageIds(root)).toEqual([]);
    expect(leafStageIds(flow([stage('a'), condition('c')]))).toEqual(['a']);
  });
});

describe('pure module boundary (rule 5)', () => {
  it('flow-elements, flow-graph and flow-elk import neither @xyflow/react nor react', () => {
    for (const file of ['flow-elements.ts', 'flow-graph.ts', 'flow-elk.ts']) {
      const source = readFileSync(
        resolve(import.meta.dirname, '../src/renderers/xyflow', file),
        'utf8',
      );
      expect(source, file).toMatch(/^import /m);
      expect(source, file).not.toMatch(/from ['"](@xyflow\/react|react|react-dom)['"/]/);
    }
  });
});
