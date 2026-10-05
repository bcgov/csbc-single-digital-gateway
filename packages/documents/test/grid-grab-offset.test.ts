import { DDDraggable } from 'gridstack/dist/dd-draggable';
import { describe, expect, it } from 'vitest';
import {
  clampGrabOffset,
  GRAB_OFFSET_CLAMP,
  GRAB_OFFSET_VAR,
  grabTranslate,
  installGrabOffsetClamp,
  type GrabOffset,
} from '../src/renderers/studio/grid-grab-offset';
import { renderStudioRenderers } from './render-studio-renderers';

// Doc 243 rule 12b — the grab offset clamp. gridstack decides WHICH grid takes a drag by the cursor, but WHERE the item
// lands by its top edge; putting the top on the cursor makes the two agree. The studio page sits in xyflow's TRANSFORMED
// viewport, so the clamp keeps gridstack's transform correction (`-yOffset`) rather than zeroing the offset.

type Clampable = ((...args: unknown[]) => GrabOffset) & { [GRAB_OFFSET_CLAMP]?: true };
const prototypeOf = () => DDDraggable.prototype as unknown as { _getDragOffset: Clampable };

/** What gridstack's `_getDragOffset` returns for a 300×90 element grabbed 45px below its top, canvas 100px down. */
const grabbedInTheMiddle = (): GrabOffset => ({
  x: 120,
  top: 400,
  offsetX: -30,
  offsetTop: -145,
  width: 300,
  height: 90,
});

describe('clampGrabOffset', () => {
  it("keeps only the transform correction, so `_dragFollow` puts the item's top on the cursor", () => {
    // `_dragFollow`: top = (clientY + offsetTop) * yScale — with -yOffset that is the cursor in the canvas's space.
    expect(clampGrabOffset(grabbedInTheMiddle(), 100).offsetTop).toBe(-100);
    expect(clampGrabOffset(grabbedInTheMiddle(), 0).offsetTop).toBe(0);
  });

  it('leaves every other field untouched, and never mutates its input', () => {
    const offset = grabbedInTheMiddle();
    expect(clampGrabOffset(offset, 100)).toEqual({ ...offset, offsetTop: -100, offsetX: 0 });
    expect(offset.offsetTop).toBe(-145);
    expect(offset.offsetX).toBe(-30);
  });

  // Doc 260 rule 12 (supersedes doc 243's "horizontal left alone"): a Grid lands a drop in the cell under the cursor.
  it("also removes the horizontal grab distance, keeping the transform's x correction", () => {
    expect(clampGrabOffset(grabbedInTheMiddle(), 100, 40).offsetX).toBe(-40);
  });
});

describe('grabTranslate', () => {
  it('translates the content back up by the grab distance, in the canvas’s CSS pixels', () => {
    expect(grabTranslate(445, 400, 1)).toBe('-45px');
    // Zoomed out to 0.5 on screen: 45 screen px are 90 CSS px.
    expect(grabTranslate(445, 400, 2)).toBe('-90px');
  });
});

describe('installGrabOffsetClamp', () => {
  /** gridstack's own method, called on a draggable with a transform, for an element 400px down grabbed at 445px. */
  function dragOffset(transform = { xOffset: 0, yOffset: 100, xScale: 1, yScale: 1 }) {
    const element = document.createElement('div');
    element.getBoundingClientRect = () =>
      ({ top: 400, left: 0, width: 300, height: 90 }) as DOMRect;
    const offset = prototypeOf()._getDragOffset.call(
      { option: {}, dragTransform: transform },
      new MouseEvent('mousedown', { clientY: 445 }),
      element,
      document.createElement('div'),
    );
    return { offset, element };
  }

  it("clamps gridstack's own result and records the grab distance on the item", () => {
    installGrabOffsetClamp();
    const { offset, element } = dragOffset();
    expect(offset.offsetTop).toBe(-100);
    expect(offset.height).toBe(90);
    expect(element.style.getPropertyValue(GRAB_OFFSET_VAR)).toBe('-45px');
  });

  it('is idempotent — installing twice wraps once', () => {
    installGrabOffsetClamp();
    const once = prototypeOf()._getDragOffset;
    installGrabOffsetClamp();
    expect(prototypeOf()._getDragOffset).toBe(once);
  });

  it("re-wraps when another clamp (@repo/forms') was installed over it", () => {
    installGrabOffsetClamp();
    const ours = prototypeOf()._getDragOffset;
    // @repo/forms' clamp zeroes offsetTop, which would put the item the canvas's offset below the cursor here.
    prototypeOf()._getDragOffset = function (this: unknown, ...args: unknown[]) {
      return { ...ours.apply(this, args), offsetTop: 0 };
    };
    installGrabOffsetClamp();
    expect(prototypeOf()._getDragOffset[GRAB_OFFSET_CLAMP]).toBe(true);
    expect(dragOffset().offset.offsetTop).toBe(-100);
  });

  it('is installed when a studio grid mounts', () => {
    const prototype = prototypeOf();
    const clamped = prototype._getDragOffset;
    prototype._getDragOffset = function (this: unknown, ...args: unknown[]) {
      return clamped.apply(this, args);
    };
    expect(prototype._getDragOffset[GRAB_OFFSET_CLAMP]).toBeUndefined();
    renderStudioRenderers({ id: 'form', type: 'Form', elements: [] });
    expect(prototype._getDragOffset[GRAB_OFFSET_CLAMP]).toBe(true);
  });
});
