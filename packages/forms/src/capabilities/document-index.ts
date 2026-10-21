import type { UISchemaElement } from '@jsonforms/core';
import { authoredId } from '../renderers/ui/authored-id';

type TreeElement = UISchemaElement & { elements?: UISchemaElement[] };

/** Where one element sits — what a `move` is a change to. */
export interface PlacedElement {
  readonly element: TreeElement;
  /** `undefined` for the root. */
  readonly parent: TreeElement | undefined;
  /** Its position among its parent's `elements`; `-1` for the root. */
  readonly index: number;
}

/**
 * Doc 222: every element carrying an authored id (doc 219), by that id.
 *
 * FIRST WINS on a duplicate id, matching `drawnStages` and `form-address` — a document with two
 * elements claiming one id is already malformed, and picking the first keeps that malformation
 * deterministic instead of making the validator's answer depend on traversal order.
 */
export function placeByAuthoredId(root: TreeElement): Map<string, PlacedElement> {
  const placed = new Map<string, PlacedElement>();

  const visit = (element: TreeElement, parent: TreeElement | undefined, index: number) => {
    const id = authoredId(element);
    if (id !== undefined && !placed.has(id)) placed.set(id, { element, parent, index });
    (element.elements ?? []).forEach((child, childIndex) =>
      visit(child as TreeElement, element, childIndex),
    );
  };

  visit(root, undefined, -1);
  return placed;
}

/** Every element at or below `root`, with its placement — including those with no authored id. */
export function placeAll(root: TreeElement): PlacedElement[] {
  const all: PlacedElement[] = [];

  const visit = (element: TreeElement, parent: TreeElement | undefined, index: number) => {
    all.push({ element, parent, index });
    (element.elements ?? []).forEach((child, childIndex) =>
      visit(child as TreeElement, element, childIndex),
    );
  };

  visit(root, undefined, -1);
  return all;
}

/**
 * Whether two values are the same, IGNORING object key order.
 *
 * Not `JSON.stringify` as `apply-inspector`'s `unchanged` does. That one compares values the studio
 * just produced, where key order is stable; this one compares a value that has been through storage
 * and back. Zod's parse REORDERS keys (declared keys first, catchall after) — which already cost
 * this codebase a "dirty for ever after a successful save" bug — so an order-sensitive compare here
 * would refuse a save whose content did not change at all.
 */
export function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => sameValue(item, b[index]));
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => Object.hasOwn(right, key) && sameValue(left[key], right[key]));
}
