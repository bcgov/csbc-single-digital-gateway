import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  STAGE_RANK_HEIGHT,
  STAGE_SIBLING_WIDTH,
  stagePositions,
} from '../src/renderers/xyflow/flow-positions';

// Doc 198 rules 1-2 — stagePositions: derived only, vertical. Supersedes doc 195 rule 12, whose
// authored-position precedence is deliberately gone (see doc 198 rule 1 and its Known Issues).

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

/** Rank runs down the canvas (y), siblings across it (x). */
const at = (rank: number, sibling: number) => ({
  x: sibling * STAGE_SIBLING_WIDTH,
  y: rank * STAGE_RANK_HEIGHT,
});

describe('stagePositions (rules 1-2)', () => {
  it('spaces ranks 240px down and siblings 320px across', () => {
    expect(STAGE_RANK_HEIGHT).toBe(240);
    expect(STAGE_SIBLING_WIDTH).toBe(320);
  });

  it('ignores an authored options.position entirely (rule 1)', () => {
    const positions = stagePositions(
      flow([stage('a', { x: -40, y: 12.5 }), stage('b', { x: 999, y: 999 })]),
    );
    expect(positions.get('a')).toEqual(at(0, 0));
    expect(positions.get('b')).toEqual(at(0, 1));
  });

  it('places a linear chain one rank apart: y = rank × 240, x = 0', () => {
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

  it('uses the LONGEST path from a root for the rank when branches rejoin', () => {
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

  it('lays siblings of one rank out across the canvas by elements order', () => {
    const positions = stagePositions(
      flow(
        [stage('a'), stage('b'), stage('x'), stage('c')],
        [
          ['a', 'b'],
          ['a', 'x'],
          ['a', 'c'],
        ],
      ),
    );
    expect(positions.get('b')).toEqual(at(1, 0));
    expect(positions.get('x')).toEqual(at(1, 1));
    expect(positions.get('c')).toEqual(at(1, 2));
  });

  it('puts unconnected Stages in rank 0', () => {
    const positions = stagePositions(flow([stage('a'), stage('b'), stage('lone')], [['a', 'b']]));
    expect(positions.get('a')).toEqual(at(0, 0));
    expect(positions.get('lone')).toEqual(at(0, 1));
  });

  it('terminates on a cycle, giving Stages on a rootless cycle rank 0', () => {
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

  it('ignores sanitised-away edges (unknown ends, self-loops) when computing ranks', () => {
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
