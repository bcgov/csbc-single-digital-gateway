import type { UISchemaElement } from '@jsonforms/core';
import { capabilityFor } from './capability-for';
import type { CapabilityMap } from './capability-types';

// Doc 221 — the WRITE gates: whether a governing template permits an edit that is about to happen.
//
// Pure, and deliberately SEPARATE from `allowedInLayout`. That function is a PLACEMENT rule — "may an
// element of this type sit in a layout of this kind" — and `review-document` asks it a pure-kind
// question with no document and no capabilities. A capability is an orthogonal question asked at the
// same three sites, so it is a second call, never a new parameter on the first.
//
// Every gate returns TRUE when ungoverned (`capabilities` absent), because `capabilityFor` resolves an
// absent map to FULLY_GRANTED. That is what lets each call site read as a plain permission check with
// no "is this document governed?" branch of its own.

/** Whether a new child may be inserted into `layout`. */
export function mayAddTo(
  capabilities: CapabilityMap | undefined,
  layout: UISchemaElement,
): boolean {
  return capabilityFor(capabilities, layout).addChildren;
}

/**
 * Whether `element` may be moved out of `from` and into `to`.
 *
 * THREE permissions, all of which must hold: the element's own `move`, the source's
 * `reorderChildren` (taking it out rearranges what is left), and the target's `addChildren` (it has
 * to land somewhere). A move within ONE layout asks the same questions of the same layout twice,
 * which is correct — reordering inside a frozen layout is still reordering.
 */
export function mayMove(
  capabilities: CapabilityMap | undefined,
  element: UISchemaElement,
  from: UISchemaElement,
  to: UISchemaElement,
): boolean {
  if (capabilities === undefined) return true;
  return (
    capabilityFor(capabilities, element).move &&
    capabilityFor(capabilities, from).reorderChildren &&
    capabilityFor(capabilities, to).addChildren
  );
}

/**
 * Whether `element` may be deleted from `parent`.
 *
 * The element's OWN `remove` overrides what its container granted (doc 220): a template may open a
 * section for deletions in general and still pin one field inside it.
 */
export function mayRemove(
  capabilities: CapabilityMap | undefined,
  element: UISchemaElement,
  parent: UISchemaElement | undefined,
): boolean {
  if (capabilities === undefined) return true;
  if (!capabilityFor(capabilities, element).remove) return false;
  return parent === undefined || capabilityFor(capabilities, parent).removeChildren;
}

/** Whether a Flow's edges may be connected, disconnected or re-pointed. */
export function mayChangeEdges(
  capabilities: CapabilityMap | undefined,
  flow: UISchemaElement,
): boolean {
  return capabilityFor(capabilities, flow).edges;
}
