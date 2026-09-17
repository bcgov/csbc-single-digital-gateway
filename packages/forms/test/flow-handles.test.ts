import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import {
  connectorClass,
  leadingAnchor,
  outputOffset,
  sourceSide,
  targetSide,
  trailingAnchor,
} from '../src/renderers/xyflow/flow-handles';

// Doc 198 rule 32, doc 199 rule 43 — which faces a card's handles sit on, and where a Condition's outputs sit
// along the face they leave by. Pure, so the measurement fallback can be tested without a browser.

describe('handle faces (doc 198 rule 32)', () => {
  it('takes edges in and out along the flow direction', () => {
    expect(targetSide('vertical')).toBe(Position.Top);
    expect(sourceSide('vertical')).toBe(Position.Bottom);
    expect(targetSide('horizontal')).toBe(Position.Left);
    expect(sourceSide('horizontal')).toBe(Position.Right);
  });
});

describe('outputOffset (doc 199 rule 43)', () => {
  it('centres an output on its measured row, down the right edge', () => {
    // The card reported this row's centre; the handle goes exactly there, so the edge leaves its own branch.
    expect(outputOffset('horizontal', 0, 3, 48)).toEqual({ top: '48px' });
    expect(outputOffset('horizontal', 2, 3, 136.5)).toEqual({ top: '136.5px' });
  });

  it('spreads the outputs evenly when the card has not been measured', () => {
    // The first paint and jsdom both land here — and so does anything that stops the card reporting boxes.
    expect(outputOffset('horizontal', 0, 3)).toEqual({ top: '25%' });
    expect(outputOffset('horizontal', 1, 3)).toEqual({ top: '50%' });
  });

  it('spreads them evenly on a VERTICAL canvas even when measured', () => {
    // The outputs leave the bottom edge there, where there is no row to line up with — a measured centre is a
    // distance down the card, which along that face would mean nothing.
    expect(outputOffset('vertical', 0, 3, 48)).toEqual({ left: '25%' });
    expect(outputOffset('vertical', 2, 3, 136)).toEqual({ left: '75%' });
  });

  it('centres a lone output, exactly where a Stage’s single handle sits', () => {
    expect(outputOffset('vertical', 0, 1)).toEqual({ left: '50%' });
    expect(outputOffset('horizontal', 0, 1)).toEqual({ top: '50%' });
  });
});

describe('what hangs off a card (doc 199 amendment 8)', () => {
  it('puts the trailing affordance on the face the flow LEAVES by', () => {
    // The leaf + continues the chain, so it must leave by the same face the edges do — under the card on a
    // vertical canvas, beyond its right edge on a horizontal one.
    expect(trailingAnchor('vertical')).toContain('top-full');
    expect(trailingAnchor('horizontal')).toContain('left-full');
  });

  it('puts the leading affordance on the face the flow ARRIVES by', () => {
    expect(leadingAnchor('vertical')).toContain('bottom-full');
    expect(leadingAnchor('horizontal')).toContain('right-full');
  });

  it('lays each out along the axis it hangs off', () => {
    // A column under the card, a row beside it — otherwise the connector line and its control stack the wrong way.
    expect(trailingAnchor('vertical')).toContain('flex-col');
    expect(trailingAnchor('horizontal')).toContain('flex-row');
    expect(leadingAnchor('vertical')).toContain('flex-col');
    expect(leadingAnchor('horizontal')).toContain('flex-row');
  });

  it('turns the connector line with them', () => {
    expect(connectorClass('vertical')).toContain('h-3');
    expect(connectorClass('horizontal')).toContain('w-3');
  });

  it('keeps the start marker and the leaf + on OPPOSITE faces (doc 203 rule 8)', () => {
    // They are documented as mirrors: one of them flipping alone is the failure this pins.
    for (const direction of ['vertical', 'horizontal'] as const) {
      expect(trailingAnchor(direction)).not.toBe(leadingAnchor(direction));
    }
  });
});
