import { Position } from '@xyflow/react';
import type { LayoutDirection } from './flow-elk';

// Which faces of a card its handles sit on (doc 198 rule 32). PURE.

/**
 * Rule 32: edges arrive along the flow's direction, so a vertical canvas takes them in at the TOP and out at the
 * BOTTOM, and a horizontal one at the LEFT and RIGHT. Flipping the layout without flipping these would leave every
 * edge leaving the wrong face — the trap doc 198 rule 12 already records for the vertical switch.
 */
export const targetSide = (direction: LayoutDirection): Position =>
  direction === 'vertical' ? Position.Top : Position.Left;

export const sourceSide = (direction: LayoutDirection): Position =>
  direction === 'vertical' ? Position.Bottom : Position.Right;

/**
 * Rule 32: where one of a Condition's outputs sits along the face it leaves by — evenly spread, as a CSS offset the
 * node applies to the right axis: `left` down the bottom edge, `top` down the right edge.
 */
export function outputOffset(
  direction: LayoutDirection,
  index: number,
  count: number,
): { left: string } | { top: string } {
  const along = `${((index + 1) / (count + 1)) * 100}%`;
  return direction === 'vertical' ? { left: along } : { top: along };
}
