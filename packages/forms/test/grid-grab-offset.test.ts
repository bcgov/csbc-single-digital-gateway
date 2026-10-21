import { DDDraggable } from 'gridstack/dist/dd-draggable';
import { describe, expect, it } from 'vitest';
import {
  clampGrabOffset,
  GRAB_OFFSET_CLAMP,
  installGrabOffsetClamp,
  type GrabOffset,
} from '../src/renderers/gridstack/grid-grab-offset';
import { createGridRenderers } from '../src/renderers-gridstack';

// Doc 190 B1 — the grab offset clamp. gridstack decides WHICH grid takes a drag by the cursor, but WHERE the
// item lands by the helper's top-left; clamping the vertical grab offset makes the two agree.

/** What gridstack's `_getDragOffset` returns for a 300×90 element grabbed 45px below its top. */
const grabbedInTheMiddle = (): GrabOffset => ({
  x: 120,
  top: 400,
  offsetX: -30,
  offsetTop: -45,
  width: 300,
  height: 90,
});

const prototypeOf = () =>
  DDDraggable.prototype as unknown as {
    _getDragOffset: ((...args: unknown[]) => GrabOffset) & { [GRAB_OFFSET_CLAMP]?: true };
  };

describe('clampGrabOffset', () => {
  it('sets offsetTop to 0 so the helper top tracks the cursor', () => {
    // `_dragFollow` positions the helper at `top: -offsetTop`, so a zero puts its top ON the cursor.
    expect(clampGrabOffset(grabbedInTheMiddle()).offsetTop).toBe(0);
  });

  it('leaves an already-top grab unchanged', () => {
    const atTheTop: GrabOffset = { ...grabbedInTheMiddle(), offsetTop: 0 };
    expect(clampGrabOffset(atTheTop)).toEqual(atTheTop);
  });

  it('keeps every other field — width, height, x, top, offsetX — untouched', () => {
    const offset = grabbedInTheMiddle();
    expect(clampGrabOffset(offset)).toEqual({ ...offset, offsetTop: 0 });
  });

  it('leaves the HORIZONTAL offset alone: it never decides which grid claims the drag', () => {
    // Nested layouts stack vertically, so only the vertical disagreement can put the parent's computed row
    // above the child. Zeroing offsetX would shift the item sideways for no benefit.
    expect(clampGrabOffset(grabbedInTheMiddle()).offsetX).toBe(-30);
  });

  it('returns a new object rather than mutating gridstack own', () => {
    const offset = grabbedInTheMiddle();
    const clamped = clampGrabOffset(offset);

    expect(clamped).not.toBe(offset);
    expect(offset.offsetTop).toBe(-45);
  });
});

describe('installGrabOffsetClamp', () => {
  it('wraps DDDraggable _getDragOffset', () => {
    installGrabOffsetClamp();
    expect(prototypeOf()._getDragOffset[GRAB_OFFSET_CLAMP]).toBe(true);
  });

  it('is idempotent — installing twice wraps once', () => {
    installGrabOffsetClamp();
    const once = prototypeOf()._getDragOffset;
    installGrabOffsetClamp();

    expect(prototypeOf()._getDragOffset).toBe(once);
  });

  it('delegates to the original and clamps what it returns', () => {
    installGrabOffsetClamp();
    const element = document.createElement('div');
    // jsdom lays nothing out, so the real method returns zeros — what matters is that it RAN and was clamped.
    const offset = prototypeOf()._getDragOffset.call(
      { option: {}, dragTransform: { xOffset: 0, yOffset: 0, xScale: 1, yScale: 1 } },
      new MouseEvent('mousedown', { clientY: 500 }),
      element,
      undefined,
    );

    expect(offset.offsetTop).toBe(0);
    expect(offset).toHaveProperty('width');
    expect(offset).toHaveProperty('height');
  });

  it('is installed by createGridRenderers, like the update guard', () => {
    // Restore the untouched method, then prove the factory puts the clamp back.
    const prototype = prototypeOf();
    const clamped = prototype._getDragOffset;
    expect(clamped[GRAB_OFFSET_CLAMP]).toBe(true);

    createGridRenderers();
    expect(prototype._getDragOffset[GRAB_OFFSET_CLAMP]).toBe(true);
  });
});
