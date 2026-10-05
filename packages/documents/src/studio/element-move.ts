import type { Uischema } from './document-types';
import { findById, idOf } from './element-ids';
import { without } from './element-remove';
import type { GridDrop } from '../renderers/default/grid-placement';
import { withGridItem } from '../renderers/studio/grid-order';
import { gridLanding, isGrid, withDisplaced } from './grid-edits';
import { spliced } from './palette-insert';

/**
 * `uischema` with the element whose id is `id` moved, with its subtree, into the `elements` of the element whose id is
 * `toLayoutId` at `index` — clamped to that list AFTER the removal (doc 243 rules 1-3). Only the uischema changes: a
 * moved Control keeps its schema property (rule 4). The SAME uischema for an unknown element or the root, an unknown
 * target or one without `elements`, a layout moved into itself or its own descendant, and a move to its current place.
 *
 * Into a Grid (doc 260 rule 21) the element takes `cell` — else the first free cell — at its reading order index, and
 * the SAME uischema when that cell is taken or the Grid is full; into any other layout it loses its `gridItem`.
 */
export function moveElement(
  uischema: Uischema,
  id: string,
  toLayoutId: string,
  index: number,
  cell?: GridDrop,
): Uischema {
  const removed: Uischema[] = [];
  const rest = without(uischema, id, removed);
  const moved = removed[0];
  // `without` never removes the root, so an unknown id and the root both leave nothing removed.
  if (moved === undefined || findById(moved, toLayoutId) !== undefined) return uischema;
  const target = findById(rest, toLayoutId);
  const elements = target?.['elements'];
  if (target === undefined || !Array.isArray(elements)) return uischema;
  if (isGrid(target)) {
    // Doc 260 rules 19, 21: the items moved out of its way first, then the arrival — one edit.
    const room = withDisplaced(rest, toLayoutId, cell?.displaced);
    const grid = findById(room, toLayoutId);
    const landing =
      grid === undefined
        ? undefined
        : gridLanding(grid, cell === undefined ? undefined : { x: cell.x, y: cell.y });
    if (landing === undefined) return uischema;
    const placed = withGridItem(moved, { ...landing.cell, w: 1, h: 1 });
    return spliced(room, toLayoutId, landing.index, placed);
  }
  const at = Math.min(Math.max(index, 0), elements.length);
  if (indexIn(findById(uischema, toLayoutId), id) === at) return uischema;
  return spliced(rest, toLayoutId, at, withGridItem(moved, undefined));
}

/** Where the child with id `id` sits in `layout`'s own `elements`, or -1. */
function indexIn(layout: Uischema | undefined, id: string): number {
  const elements = layout?.['elements'];
  return Array.isArray(elements)
    ? elements.findIndex((child: unknown) => isRecord(child) && idOf(child) === id)
    : -1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
