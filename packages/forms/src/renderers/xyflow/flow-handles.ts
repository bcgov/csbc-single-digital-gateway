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
 * Doc 198 rule 32, amended 2026-09-17 (user: "the dangling add button should come from the trailing edge"):
 * where an affordance that HANGS OFF a card sits — the leaf + and the empty-Flow origin + on the trailing face,
 * the Start marker on the leading one.
 *
 * They follow the handles, for the same reason the handles follow the direction: an affordance that continues
 * the flow has to leave by the face the flow leaves by, or it reads as belonging to the card below rather than
 * to the chain. On a horizontal canvas that is the right edge, laid out as a row; on a vertical one the bottom
 * edge, laid out as a column. `flow-start-marker` is documented as the leaf +'s MIRROR (doc 203 rule 8), so the
 * two move together — one of them flipping alone is what would look broken.
 *
 * Child order is the same either way: the connector line nearest the card, the control beyond it.
 */
export const trailingAnchor = (direction: LayoutDirection): string =>
  direction === 'vertical'
    ? 'top-full left-1/2 -translate-x-1/2 flex-col pt-1'
    : 'left-full top-1/2 -translate-y-1/2 flex-row pl-1';

export const leadingAnchor = (direction: LayoutDirection): string =>
  direction === 'vertical'
    ? 'bottom-full left-1/2 -translate-x-1/2 flex-col pb-1'
    : 'right-full top-1/2 -translate-y-1/2 flex-row pr-1';

/** The little line joining such an affordance to its card: down the column, or along the row. */
export const connectorClass = (direction: LayoutDirection): string =>
  direction === 'vertical' ? 'h-3 w-px bg-border' : 'w-3 h-px bg-border';
