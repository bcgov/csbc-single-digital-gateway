import { describe, expect, it } from 'vitest';
import { connect, connectTargets, freeOutputs } from '../src/studio/connect-edits';
import { condition, edge, form, funnel, links, row } from './funnel-fixtures';

/** a → b → c, and a floating f; c1 headless with rows r1, r2 (r1 set to x) and a free default. */
const flow = () =>
  funnel(
    [form('a'), form('b'), form('c'), form('f'), form('x')],
    [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c1', 'x', 'r1')],
    [condition('c1', [row('r1'), row('r2')], 'Eligible?')],
  );

describe('freeOutputs (doc 235 rule 7)', () => {
  it("lists a Form's output only while nothing leaves it", () => {
    expect(freeOutputs(flow(), 'c')).toEqual([{ source: 'c' }]);
    expect(freeOutputs(flow(), 'a')).toEqual([]);
  });

  it("lists a Condition's free branch rows in order, then its default", () => {
    expect(freeOutputs(flow(), 'c1')).toEqual([
      { source: 'c1', sourceHandle: 'r2' },
      { source: 'c1' },
    ]);
  });

  it('is empty for an unknown node', () => {
    expect(freeOutputs(flow(), 'nope')).toEqual([]);
  });
});

describe('connectTargets (doc 235 rule 7)', () => {
  it('from a free output: every node but the source and those it is reached from', () => {
    const targets = connectTargets(flow(), { kind: 'output', output: { source: 'c' } });

    expect([...targets.keys()].toSorted()).toEqual(['c1', 'f', 'x']);
    expect(targets.get('f')).toEqual([{ source: 'c' }]);
  });

  it('into a headless Condition: nodes with a free output, never itself or what it reaches', () => {
    const targets = connectTargets(flow(), { kind: 'into', nodeId: 'c1' });

    // a and b have edges leaving them; x is reached from c1 (a loop); c1 is the target itself.
    expect([...targets.keys()].toSorted()).toEqual(['c', 'f']);
    expect(targets.get('c')).toEqual([{ source: 'c' }]);
  });

  it("offers a Condition's every free output when it is the one picked", () => {
    const start = funnel(
      [form('a'), form('y')],
      [edge('e1', 'c2', 'y', 'q1')],
      [condition('c1', [row('r1')]), condition('c2', [row('q1'), row('q2')])],
    );

    expect(connectTargets(start, { kind: 'into', nodeId: 'c1' }).get('c2')).toEqual([
      { source: 'c2', sourceHandle: 'q2' },
      { source: 'c2' },
    ]);
  });
});

describe('connect (doc 235 rule 9)', () => {
  it('appends an edge from the output to the target', () => {
    const next = connect(flow(), { source: 'c' }, 'f');

    expect(links(next)).toEqual(['a>b', 'b>c', 'c1[r1]>x', 'c>f']);
  });

  it('connects a branch row into a Condition', () => {
    const next = connect(flow(), { source: 'c1', sourceHandle: 'r2' }, 'f');

    expect(links(next).at(-1)).toBe('c1[r2]>f');
  });

  it.each([
    ['an output that already has an edge', { source: 'a' }, 'f'],
    ['a self-link', { source: 'c' }, 'c'],
    ['a loop', { source: 'c' }, 'a'],
    ['an unknown target', { source: 'c' }, 'nope'],
    ['an unknown source', { source: 'nope' }, 'f'],
  ])('refuses %s, returning the variant unchanged', (_name, output, target) => {
    const start = flow();

    expect(connect(start, output, target)).toBe(start);
  });
});
