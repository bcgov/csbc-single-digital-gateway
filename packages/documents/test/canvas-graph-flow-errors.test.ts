import { describe, expect, it } from 'vitest';
import { canvasGraph, type CanvasGraph } from '../src/studio/canvas-graph';
import { withStart } from '../src/studio/funnel-model';
import { condition, edge, form, funnel, row } from './funnel-fixtures';

const graphOf = (graph: CanvasGraph) => {
  if (graph.kind !== 'graph') throw new Error(`expected a graph, got ${graph.kind}`);
  return graph;
};
const marksOf = (graph: ReturnType<typeof graphOf>) =>
  Object.fromEntries(
    graph.nodes
      .filter((n) => n.type === 'form' || n.type === 'condition')
      .map((n) => [n.id, n.data]),
  );

/** c1 heads the Funnel and nothing leads into it: c1 → (r1) x ; (default) y. */
const headless = () =>
  withStart(
    funnel(
      [form('x'), form('y'), form('f')],
      [edge('e1', 'c1', 'x', 'r1'), edge('e2', 'c1', 'y')],
      [condition('c1', [row('r1')], 'Eligible?')],
    ),
    'c1',
  );

describe('canvasGraph — Start / End and headless Conditions (doc 232)', () => {
  it('never badges a Condition Start, and a flow that starts at one has no End either', () => {
    const marks = marksOf(graphOf(canvasGraph(headless())));

    for (const id of ['c1', 'x', 'y', 'f']) {
      expect(marks[id]).toMatchObject({ start: false, end: false });
    }
  });

  it('never badges a Condition End, even when no persisted edge leaves it', () => {
    const variant = withStart(
      funnel([form('a')], [edge('e0', 'a', 'c1')], [condition('c1', [row('r1')])]),
      'a',
    );
    const marks = marksOf(graphOf(canvasGraph(variant)));

    expect(marks['a']).toMatchObject({ start: true, end: false });
    expect(marks['c1']).toMatchObject({ start: false, end: false });
  });

  it('draws a leading edge with a Form-only + from a point above a headless Condition', () => {
    const graph = graphOf(canvasGraph(headless()));
    const lead = graph.nodes.find((n) => n.id === 'lead:c1')!;
    const c1 = graph.nodes.find((n) => n.id === 'c1')!;

    expect(lead.type).toBe('lead');
    expect(lead.position.y).toBeLessThan(c1.position.y);
    expect(c1.data['first']).toBe(false);
    expect(graph.edges.find((e) => e.id === 'leading:c1')).toMatchObject({
      source: 'lead:c1',
      target: 'c1',
      data: { add: { kind: 'leading', nodeId: 'c1' }, sourceName: 'Eligible?', invalid: true },
    });
  });

  it('marks EVERY node and edge invalid while a Condition is headless — over floating, too', () => {
    const graph = graphOf(canvasGraph(headless()));

    const drawn = graph.nodes.filter((n) => n.type === 'form' || n.type === 'condition');
    expect(drawn).toHaveLength(4);
    expect(drawn.every((n) => n.data['invalid'] === true && n.data['floating'] === false)).toBe(
      true,
    );
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.edges.every((e) => e.data?.invalid === true && e.data.floating !== true)).toBe(
      true,
    );
  });

  it('marks nothing invalid when every Condition has something leading into it', () => {
    const variant = withStart(
      funnel(
        [form('a'), form('x'), form('y')],
        [edge('e0', 'a', 'c1'), edge('e1', 'c1', 'x', 'r1'), edge('e2', 'c1', 'y')],
        [condition('c1', [row('r1', 'r1', [{ id: 'k', field: 'age', operator: 'isNotEmpty' }])])],
      ),
      'a',
    );
    const graph = graphOf(canvasGraph(variant));

    expect(graph.nodes.some((n) => n.data['invalid'] === true)).toBe(false);
    expect(graph.nodes.some((n) => n.type === 'lead')).toBe(false);
  });
});
