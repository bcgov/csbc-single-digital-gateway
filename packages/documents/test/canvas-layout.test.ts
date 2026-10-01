import { describe, expect, it } from 'vitest';
import { COLUMN_WIDTH, layeredLayout } from '../src/studio/canvas-layout';

describe('layeredLayout', () => {
  it('stacks a chain in one column, ranked by longest path', () => {
    const slots = layeredLayout(
      ['a', 'b', 'c'],
      new Map([
        ['a', ['b']],
        ['b', ['c']],
      ]),
    );

    expect([...slots.values()]).toEqual([
      { x: 0, rank: 0 },
      { x: 0, rank: 1 },
      { x: 0, rank: 2 },
    ]);
  });

  it("fans a node's children around it in output order, and keeps a column between neighbours", () => {
    const slots = layeredLayout(['c', 'x', 'y', 'z'], new Map([['c', ['x', 'y', 'z']]]));

    expect(['x', 'y', 'z'].map((id) => slots.get(id))).toEqual([
      { x: -COLUMN_WIDTH, rank: 1 },
      { x: 0, rank: 1 },
      { x: COLUMN_WIDTH, rank: 1 },
    ]);
  });

  it('ranks a merge below its deepest parent', () => {
    const slots = layeredLayout(
      ['a', 'b', 'm'],
      new Map([
        ['a', ['b', 'm']],
        ['b', ['m']],
      ]),
    );
    expect(slots.get('m')?.rank).toBe(2);
  });

  it('spreads several roots in order, and survives a cycle', () => {
    const roots = layeredLayout(['a', 'b'], new Map());
    expect([roots.get('a')?.x, roots.get('b')?.x]).toEqual([-COLUMN_WIDTH / 2, COLUMN_WIDTH / 2]);
    expect(() =>
      layeredLayout(
        ['a', 'b'],
        new Map([
          ['a', ['b']],
          ['b', ['a']],
        ]),
      ),
    ).not.toThrow();
  });
});
