import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  STAGE_COLUMN_WIDTH,
  STAGE_ROW_HEIGHT,
  stagePositions,
} from '../src/renderers/xyflow/flow-positions';

// Doc 195 rule 12 — stagePositions: authored position, else layered auto layout.

const stage = (id: string, position?: unknown) =>
  ({
    type: 'Stage',
    elements: [],
    options: { id, ...(position === undefined ? {} : { position }) },
  }) as UISchemaElement;

const flow = (
  elements: readonly UISchemaElement[],
  pairs: readonly (readonly [string, string])[] = [],
) =>
  ({
    type: 'Flow',
    elements,
    options: { edges: pairs.map(([source, target], i) => ({ id: `e${i}`, source, target })) },
  }) as UISchemaElement;

const at = (column: number, row: number) => ({
  x: column * STAGE_COLUMN_WIDTH,
  y: row * STAGE_ROW_HEIGHT,
});

describe('stagePositions (rule 12)', () => {
  it('spaces columns 320px and rows 240px apart', () => {
    expect(STAGE_COLUMN_WIDTH).toBe(320);
    expect(STAGE_ROW_HEIGHT).toBe(240);
  });

  it('uses an authored options.position whose x and y are finite numbers as is', () => {
    const positions = stagePositions(
      flow([stage('a', { x: -40, y: 12.5 }), stage('b', { x: 0, y: 0 })]),
    );
    expect(positions.get('a')).toEqual({ x: -40, y: 12.5 });
    expect(positions.get('b')).toEqual({ x: 0, y: 0 });
  });

  it('auto-places a Stage whose position is absent, partial or non-finite', () => {
    const positions = stagePositions(
      flow([
        stage('a'),
        stage('b', { x: 10 }),
        stage('c', { x: Number.NaN, y: 1 }),
        stage('d', '1,2'),
      ]),
    );
    expect([...positions.values()]).toEqual([at(0, 0), at(0, 1), at(0, 2), at(0, 3)]);
  });

  it('places a linear chain one column apart: x = column × 320, y = 0', () => {
    const positions = stagePositions(
      flow(
        [stage('c'), stage('a'), stage('b')],
        [
          ['a', 'b'],
          ['b', 'c'],
        ],
      ),
    );
    expect(positions.get('a')).toEqual(at(0, 0));
    expect(positions.get('b')).toEqual(at(1, 0));
    expect(positions.get('c')).toEqual(at(2, 0));
  });

  it('uses the LONGEST path from a root for the column when branches rejoin', () => {
    const positions = stagePositions(
      flow(
        [stage('a'), stage('b'), stage('c'), stage('d')],
        [
          ['a', 'b'],
          ['b', 'c'],
          ['c', 'd'],
          ['a', 'd'],
        ],
      ),
    );
    expect(positions.get('d')).toEqual(at(3, 0));
  });

  it('stacks auto-placed Stages in one column by elements order, skipping authored ones', () => {
    const positions = stagePositions(
      flow(
        [stage('a'), stage('b'), stage('x', { x: 5, y: 5 }), stage('c')],
        [
          ['a', 'b'],
          ['a', 'x'],
          ['a', 'c'],
        ],
      ),
    );
    expect(positions.get('b')).toEqual(at(1, 0));
    expect(positions.get('x')).toEqual({ x: 5, y: 5 });
    expect(positions.get('c')).toEqual(at(1, 1));
  });

  it('puts unconnected Stages in column 0', () => {
    const positions = stagePositions(flow([stage('a'), stage('b'), stage('lone')], [['a', 'b']]));
    expect(positions.get('a')).toEqual(at(0, 0));
    expect(positions.get('lone')).toEqual(at(0, 1));
  });

  it('terminates on a cycle, giving Stages on a rootless cycle column 0', () => {
    const positions = stagePositions(
      flow(
        [stage('a'), stage('b')],
        [
          ['a', 'b'],
          ['b', 'a'],
        ],
      ),
    );
    expect(positions.get('a')).toEqual(at(0, 0));
    expect(positions.get('b')).toEqual(at(0, 1));
  });

  it('ignores sanitised-away edges (unknown ends, self-loops) when computing columns', () => {
    const positions = stagePositions(
      flow(
        [stage('a'), stage('b')],
        [
          ['a', 'ghost'],
          ['b', 'b'],
        ],
      ),
    );
    expect(positions.get('a')).toEqual(at(0, 0));
    expect(positions.get('b')).toEqual(at(0, 1));
  });

  it('keys placeholder Stages by their node id', () => {
    const noId = { type: 'Stage', elements: [] } as UISchemaElement;
    expect(stagePositions(flow([stage('a'), noId])).get('__stage-1')).toEqual(at(0, 1));
  });
});
