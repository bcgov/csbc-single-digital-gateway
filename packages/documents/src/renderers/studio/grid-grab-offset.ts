import { DDDraggable } from 'gridstack/dist/dd-draggable';

// The grab offset clamp (doc 243 rule 12b), after @repo/forms' (its doc 190 B1). gridstack 13.2.0 — re-verify on
// upgrade. GridNestEngine relies on it: with the dragged item's top ON the cursor, the drag rect's top edge IS the cursor.
//
// gridstack answers two questions during a drag, and answers them from DIFFERENT points:
//
//   which grid takes the drag  →  the CURSOR, through each droppable's `mouseenter` hit-test
//   where the item lands       →  the dragged item's top-left, `helper.getBoundingClientRect()` in `onDrag`
//
// Grab a tall field in its middle and the two disagree by half its height: gridstack reflowed the page by where the
// item's edges were while the cursor was somewhere else, and a nested layout was never entered (bug B1).
//
// Two differences from @repo/forms' clamp, both because the studio page sits inside xyflow's TRANSFORMED viewport:
// - `_getDragOffset` folds the transform into `offsetTop` (`-clientY + top - yOffset`) and `_dragFollow` places the item
//   at `(clientY + offsetTop) * yScale`. Forms zeroes `offsetTop`, which also drops `-yOffset`: here the item hung below
//   the cursor by the canvas's screen offset. The clamp is `-yOffset` — exactly the cursor.
// - The item's CONTENT is translated back up by the grab distance (`--gs-grab-offset`, styles.css), so the field stays
//   where it was grabbed. gridstack measures the item's own box, which a child's translate never moves.

/** Marks our wrapper of `DDDraggable.prototype._getDragOffset`. */
export const GRAB_OFFSET_CLAMP = Symbol.for('@repo/documents/grab-offset-clamp');

/** The custom property the dragged item's content is translated by (styles.css). */
export const GRAB_OFFSET_VAR = '--gs-grab-offset';

/** What `_getDragOffset` returns: the grabbed element's box, and the cursor's offset into it. */
export interface GrabOffset {
  x: number;
  top: number;
  offsetX: number;
  /** `-event.clientY + targetOffset.top - transform.yOffset`. */
  offsetTop: number;
  width: number;
  height: number;
}

/** The drag's transform reference: `yOffset` is the transformed container's screen top, `yScale` screen → CSS px. */
interface DragTransform {
  yOffset: number;
  yScale: number;
}

/**
 * The grab offset with its VERTICAL grab distance removed but the transform correction kept, so `_dragFollow` puts the
 * item's top exactly on the cursor. The HORIZONTAL offset is left alone: nested layouts stack vertically, so only the
 * vertical disagreement decides which grid claims a drag.
 */
export const clampGrabOffset = (offset: GrabOffset, yOffset: number): GrabOffset => ({
  ...offset,
  offsetTop: 0 - yOffset, // never -0
});

/** How far the content is translated back up: the grab distance on screen, in the item's CSS pixels. */
export const grabTranslate = (clientY: number, itemTop: number, yScale: number): string =>
  `${-(clientY - itemTop) * yScale}px`;

type GetDragOffset = (
  this: DDDraggable,
  event: MouseEvent,
  el: HTMLElement,
  parent?: HTMLElement,
) => GrabOffset;
type ClampedGetDragOffset = GetDragOffset & { [GRAB_OFFSET_CLAMP]?: true };

/**
 * Makes our clamp the OUTERMOST wrapper of `DDDraggable.prototype._getDragOffset`. Called on every studio grid init:
 * @repo/forms installs its own clamp on the same prototype (its pages share the SPA), and one wrapped over ours would
 * zero `offsetTop` again. Ours recomputes everything it returns, so whatever it wraps is harmless.
 *
 * `_getDragOffset` is a plain method call at drag start, not a bound handler, so the prototype is the right place: a
 * per-instance patch is discarded whenever gridstack rebuilds its draggables.
 */
export function installGrabOffsetClamp(): void {
  const prototype = DDDraggable.prototype as unknown as { _getDragOffset: ClampedGetDragOffset };
  const inner = prototype._getDragOffset;
  if (typeof inner !== 'function' || inner[GRAB_OFFSET_CLAMP]) return;

  const clamped: ClampedGetDragOffset = function _getDragOffset(this, event, el, parent) {
    const offset = inner.call(this, event, el, parent);
    const { dragTransform } = this as unknown as { dragTransform?: DragTransform };
    const transform = dragTransform ?? { yOffset: 0, yScale: 1 };
    el.style.setProperty(
      GRAB_OFFSET_VAR,
      grabTranslate(event.clientY, el.getBoundingClientRect().top, transform.yScale),
    );
    return clampGrabOffset(offset, parent === undefined ? 0 : transform.yOffset);
  };
  clamped[GRAB_OFFSET_CLAMP] = true;
  prototype._getDragOffset = clamped;
}
