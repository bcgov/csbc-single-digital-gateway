import { describe, expect, it } from 'vitest';
import { canvasGraph, type AddEdge, type CanvasGraph } from '../src/studio/canvas-graph';
import { withStart } from '../src/studio/funnel-model';
import { condition, control, edge, form, funnel, row } from './funnel-fixtures';

const graphOf = (graph: CanvasGraph) => {
  if (graph.kind !== 'graph') throw new Error(`expected a graph, got ${graph.kind}`);
  return graph;
};
const describeEdge = (e: AddEdge) =>
  `${e.source}${e.sourceHandle === undefined ? '' : `[${e.sourceHandle}]`}>${e.target} ${e.data?.add.kind}`;

describe('canvasGraph', () => {
  it('is empty for `{}`, and refuses a root other than a Form or Funnel', () => {
    expect(canvasGraph({})).toEqual({ kind: 'empty' });
    expect(canvasGraph({ type: 'Service' })).toEqual({ kind: 'unsupported', type: 'Service' });
  });

  it('draws a Form root as a first node with a trailing edge to an end node', () => {
    const graph = graphOf(canvasGraph(form('a', 'Apply')));

    expect(graph.nodes.map((n) => [n.id, n.type])).toEqual([
      ['a', 'form'],
      ['end:a:out', 'end'],
    ]);
    // A lone Form is not a Funnel, so it is never badged Start or End.
    expect(graph.nodes[0]!.data).toEqual({
      formId: 'a',
      label: 'Apply',
      first: true,
      start: false,
      end: false,
      invalid: false,
      floating: false,
    });
    expect(graph.edges.map(describeEdge)).toEqual(['a>end:a:out trailing']);
    expect(graph.edges[0]!.data).toMatchObject({
      add: { kind: 'trailing', output: { source: 'a' } },
      sourceName: 'Apply',
    });
  });

  it('draws a Condition with an output per row then the default, each labelled, and trails its free outputs', () => {
    const variant = withStart(
      funnel(
        [form('a', 'A', [control('age')]), form('x')],
        [edge('e0', 'a', 'c1'), edge('e1', 'c1', 'x', 'r1')],
        [
          condition('c1', [
            row('r1', 'Adults', [{ id: 'k', field: 'age', operator: 'gte', value: 18 }]),
            row('r2', 'Condition 2'),
          ]),
        ],
      ),
      'a',
    );
    const graph = graphOf(
      canvasGraph(variant, { properties: { age: { type: 'integer', title: 'Age' } } }),
    );
    const node = graph.nodes.find((n) => n.id === 'c1')!;

    expect(node.data).toEqual({
      conditionId: 'c1',
      label: null,
      first: false,
      start: false,
      end: false,
      invalid: false,
      floating: false,
      outputs: ['r1', 'r2', 'default'],
    });
    expect(graph.edges.map(describeEdge)).toEqual([
      'a>c1 between',
      'x>end:x:out trailing',
      'c1[r1]>x between',
      'c1[r2]>end:c1:r2 trailing',
      'c1[default]>end:c1:default trailing',
    ]);
    const labels = graph.edges
      .filter((e) => e.source === 'c1')
      .map((e) => [e.data?.branchLabel, e.data?.isDefault]);
    expect(labels).toEqual([
      ['Age is at least 18', undefined],
      ['Condition 2 (not set)', undefined],
      ['Otherwise', true],
    ]);
    expect(graph.edges.at(-1)!.data?.add).toEqual({ kind: 'trailing', output: { source: 'c1' } });
  });

  it('ignores edges to missing nodes, a Form edge with a handle, an unknown row, and a second edge from one output', () => {
    const variant = funnel(
      [form('a'), form('b'), form('x')],
      [
        edge('bad1', 'a', 'gone'),
        edge('bad2', 'a', 'b', 'r1'),
        edge('bad3', 'c1', 'x', 'nope'),
        edge('ok', 'a', 'c1'),
        edge('dup', 'a', 'b'),
      ],
      [condition('c1', [row('r1')])],
    );
    const persisted = graphOf(canvasGraph(variant)).edges.filter(
      (e) => e.data?.add.kind === 'between',
    );

    expect(persisted.map((e) => e.id)).toEqual(['ok']);
  });

  it("lays a Condition's branches out side by side, one rank below it", () => {
    const variant = funnel(
      [form('a'), form('x'), form('y')],
      [edge('e0', 'a', 'c1'), edge('e1', 'c1', 'x', 'r1'), edge('e2', 'c1', 'y')],
      [condition('c1', [row('r1')])],
    );
    const at = new Map(graphOf(canvasGraph(variant)).nodes.map((n) => [n.id, n.position]));

    expect(at.get('x')!.y).toBe(at.get('y')!.y);
    expect(at.get('x')!.x).toBeLessThan(at.get('y')!.x);
    expect(at.get('x')!.y).toBeGreaterThan(at.get('c1')!.y);
  });

  it('badges the node options.start names as Start, and the last nodes of chains from it as End — never a floating node', () => {
    const variant = withStart(
      funnel(
        [form('a'), form('b'), form('x')],
        [edge('e0', 'a', 'c1'), edge('e1', 'c1', 'x', 'r1')],
        [condition('c1', [row('r1', 'x', [{ id: 'k', field: 'age', operator: 'isNotEmpty' }])])],
      ),
      'a',
    );
    const marks = Object.fromEntries(
      graphOf(canvasGraph(variant))
        .nodes.filter((n) => n.type !== 'end')
        .map((n) => [n.id, [n.data['start'], n.data['end']]]),
    );

    expect(marks).toEqual({
      a: [true, false],
      b: [false, false],
      x: [false, true],
      c1: [false, false],
    });
  });

  it('never badges the end of a floating chain, and badges a start that leads nowhere as both', () => {
    const variant = withStart(
      funnel([form('a'), form('f1'), form('f2')], [edge('e1', 'f1', 'f2')]),
      'a',
    );
    const marks = Object.fromEntries(
      graphOf(canvasGraph(variant))
        .nodes.filter((n) => n.type !== 'end')
        .map((n) => [n.id, [n.data['start'], n.data['end']]]),
    );

    expect(marks).toEqual({ a: [true, true], f1: [false, false], f2: [false, false] });
  });

  it('marks nodes not reachable from the start, and every edge leaving them, floating', () => {
    const variant = withStart(
      funnel(
        [form('a'), form('b'), form('f1'), form('f2')],
        [edge('e1', 'a', 'b'), edge('e2', 'f1', 'f2')],
      ),
      'a',
    );
    const graph = graphOf(canvasGraph(variant));

    expect(graph.nodes.filter((n) => n.data['floating'] === true).map((n) => n.id)).toEqual([
      'f1',
      'f2',
    ]);
    expect(
      graph.edges
        .filter((e) => e.data?.floating === true)
        .map((e) => e.id)
        .toSorted(),
    ).toEqual(['e2', 'trailing:f2:out']);
  });

  it('never marks anything floating outside a Funnel', () => {
    expect(graphOf(canvasGraph(form('a'))).edges[0]?.data?.floating).toBeUndefined();
  });

  it('badges no Start when the Funnel names none', () => {
    const graph = graphOf(canvasGraph(funnel([form('a')], [])));
    expect(graph.nodes.find((n) => n.id === 'a')?.data['start']).toBe(false);
  });

  it('marks an unset branch, and every node and edge downstream of it, invalid — and nothing else', () => {
    const set = { id: 'k', field: 'age', operator: 'gte' as const, value: 18 };
    const variant = funnel(
      [form('a'), form('x'), form('y'), form('z')],
      [
        edge('e0', 'a', 'c1'),
        edge('bad', 'c1', 'x', 'unset'),
        edge('e2', 'x', 'y'),
        edge('ok', 'c1', 'z', 'set'),
      ],
      [condition('c1', [row('unset', 'Condition 1'), row('set', 'Adults', [set])])],
    );
    const graph = graphOf(canvasGraph(variant));

    expect(graph.nodes.filter((n) => n.data['invalid'] === true).map((n) => n.id)).toEqual([
      'x',
      'y',
    ]);
    expect(
      graph.edges
        .filter((e) => e.data?.invalid === true)
        .map((e) => e.id)
        .toSorted(),
    ).toEqual(['bad', 'e2', 'trailing:y:out']);
  });

  it('treats a clause missing its value as unset', () => {
    const variant = funnel(
      [form('a')],
      [edge('e0', 'a', 'c1')],
      [condition('c1', [row('r1', 'x', [{ id: 'k', field: 'age', operator: 'gte' }])])],
    );
    const trailing = graphOf(canvasGraph(variant)).edges.find((e) => e.sourceHandle === 'r1');

    expect(trailing?.data?.invalid).toBe(true);
  });
});
