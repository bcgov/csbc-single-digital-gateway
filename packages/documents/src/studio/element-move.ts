import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import { without } from './element-remove';
import { spliced } from './palette-insert';

/**
 * `uischema` with the element whose id is `id` moved, with its subtree, into the `elements` of the element whose id is
 * `toLayoutId` at `index` — clamped to that list AFTER the removal (doc 243 rules 1-3). Only the uischema changes: a
 * moved Control keeps its schema property (rule 4). The SAME uischema for an unknown element or the root, an unknown
 * target or one without `elements`, a layout moved into itself or its own descendant, and a move to its current place.
 */
export function moveElement(
  uischema: Uischema,
  id: string,
  toLayoutId: string,
  index: number,
): Uischema {
  const removed: Uischema[] = [];
  const rest = without(uischema, id, removed);
  const moved = removed[0];
  // `without` never removes the root, so an unknown id and the root both leave nothing removed.
  if (moved === undefined || findById(moved, toLayoutId) !== undefined) return uischema;
  const target = findById(rest, toLayoutId);
  const elements = target?.['elements'];
  if (!Array.isArray(elements)) return uischema;
  const at = Math.min(Math.max(index, 0), elements.length);
  if (indexIn(findById(uischema, toLayoutId), id) === at) return uischema;
  return spliced(rest, toLayoutId, at, moved);
}

function findById(node: Uischema, id: string): Uischema | undefined {
  if (idOf(node) === id) return node;
  const elements = node['elements'];
  if (!Array.isArray(elements)) return undefined;
  for (const child of elements) {
    const found = isRecord(child) ? findById(child, id) : undefined;
    if (found !== undefined) return found;
  }
  return undefined;
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
