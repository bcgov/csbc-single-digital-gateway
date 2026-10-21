import { DDDraggable } from 'gridstack/dist/dd-draggable';

// The grab offset clamp (doc 190 B1). gridstack 13.2.0 — re-verify on upgrade.
//
// gridstack answers two questions during a drag, and answers them from DIFFERENT points:
//
//   which grid takes the drag  →  the CURSOR, through each droppable's `mouseenter` hit-test
//   where the item lands       →  the HELPER's top-left, `helper.getBoundingClientRect()` in `onDrag`
//
// Those are the same point only when the element was grabbed near its top edge. Grab a tall field in the middle
// and its top sits ~45px above the cursor, so the PARENT computes a row above the nested layout, inserts its
// placeholder there, and the reflow pushes the nested layout out from under the cursor — which means the child
// never receives the `mouseenter` that would hand it the drag. The item lands in the parent, and the nested
// layout visibly moves out of the way.
//
// Found by hand: a checkbox (short) always worked, a text field grabbed at its TOP worked, and the same field
// grabbed at its CENTRE did not. That is the offset, not the element.

/** Marks the wrapped `DDDraggable.prototype._getDragOffset`, so the clamp is only ever installed once. */
export const GRAB_OFFSET_CLAMP = Symbol.for('@repo/forms/grab-offset-clamp');

/** What `_getDragOffset` returns: the grabbed element's box, and the cursor's offset into it. */
export interface GrabOffset {
  x: number;
  top: number;
  offsetX: number;
  /** `-event.clientY + targetOffset.top` — negative the further down the element the cursor grabbed. */
  offsetTop: number;
  width: number;
  height: number;
}

/**
 * The grab offset with its VERTICAL component removed, so the helper's top edge tracks the cursor.
 *
 * `_dragFollow` positions the helper at `top: -offsetTop`, so a zero makes the helper's top land on the
 * cursor — and gridstack's two answers above become one point.
 *
 * The HORIZONTAL offset is deliberately left alone. It never decides which grid claims a drag: nested layouts
 * stack vertically, so only the vertical disagreement can put the parent's computed row above the child. Zeroing
 * it too would move the item sideways under the cursor for no benefit.
 */
export const clampGrabOffset = (offset: GrabOffset): GrabOffset => ({ ...offset, offsetTop: 0 });

type GetDragOffset = (
  this: DDDraggable,
  event: MouseEvent,
  el: HTMLElement,
  parent: HTMLElement,
) => GrabOffset;
type ClampedGetDragOffset = GetDragOffset & { [GRAB_OFFSET_CLAMP]?: true };

/**
 * Installs the clamp on `DDDraggable.prototype`. Idempotent, and shaped exactly like
 * `installGridUpdateGuard()` (doc 183 bug B2) — the same kind of narrow, documented reach into gridstack that
 * `retargetDropTarget` makes (doc 190).
 *
 * `_getDragOffset` is a plain method call (`this._getDragOffset(...)` at drag start), not a bound handler, so
 * the prototype is the right place: a per-instance patch is discarded whenever gridstack rebuilds its
 * draggables, which every options update does.
 */
export function installGrabOffsetClamp(): void {
  const prototype = DDDraggable.prototype as unknown as { _getDragOffset: ClampedGetDragOffset };
  const original = prototype._getDragOffset;
  if (typeof original !== 'function' || original[GRAB_OFFSET_CLAMP]) return;

  const clamped: ClampedGetDragOffset = function _getDragOffset(
    this: DDDraggable,
    ...args: Parameters<GetDragOffset>
  ): GrabOffset {
    return clampGrabOffset(original.apply(this, args));
  };
  clamped[GRAB_OFFSET_CLAMP] = true;
  prototype._getDragOffset = clamped;
}
