import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import {
  connectorClass,
  leadingAnchor,
  sourceSide,
  targetSide,
  trailingAnchor,
} from '../src/renderers/xyflow/flow-handles';

// Doc 198 rule 32 — which faces a card's handles sit on, and which face the affordances that hang off it use.
//
// Doc 199 rule 43 no longer appears here: a Condition's outputs are not POSITIONED at all any more, they are
// rendered inside their own rows, so there is no offset left to compute or to test.

describe('handle faces (doc 198 rule 32)', () => {
  it('takes edges in and out along the flow direction', () => {
    expect(targetSide('vertical')).toBe(Position.Top);
    expect(sourceSide('vertical')).toBe(Position.Bottom);
    expect(targetSide('horizontal')).toBe(Position.Left);
    expect(sourceSide('horizontal')).toBe(Position.Right);
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
