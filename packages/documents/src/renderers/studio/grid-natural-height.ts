// Doc 260 rule 9b: a Grid child's frame STRETCHES to fill its cell (styles.css), so its own height is the row's, never
// its content's — measuring it would only ever grow the rows. Its natural height is read from what flows inside it.

/** The children of a stretched studio element that take space: everything but its absolutely placed badges and bars. */
function inFlow(element: HTMLElement): HTMLElement[] {
  return [...element.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      !['absolute', 'fixed'].includes(getComputedStyle(child).position),
  );
}

/** Whether `el` is the studio element wrapper the Grid stretches (any other content child keeps its own height). */
const isStretched = (el: HTMLElement) => el.getAttribute('data-slot') === 'studio-element';

/**
 * How tall `el` would be if it were not stretched, from LAYOUT sizes (doc 236 rule 28): the EXTENT of its in-flow
 * children — lowest bottom minus highest top, so content centred or pushed down in the frame (rule 32) never counts the
 * space above it — plus the frame's vertical padding and borders.
 */
export function naturalHeight(el: HTMLElement): number {
  if (!isStretched(el)) return el.offsetHeight;
  const style = getComputedStyle(el);
  const children = inFlow(el);
  const top = Math.min(...children.map((child) => child.offsetTop));
  const bottom = Math.max(...children.map((child) => child.offsetTop + child.offsetHeight));
  const frame = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'] as const;
  const inset = frame.reduce((sum, key) => sum + (Number.parseFloat(style[key]) || 0), 0);
  return (children.length === 0 ? 0 : bottom - top) + inset;
}

/**
 * What a ResizeObserver must watch for `el`'s natural height to change: a stretched wrapper's size follows the row, so
 * its in-flow children too — and the wrapper itself, which grows past the row when its content does.
 */
export function measuredParts(el: HTMLElement): HTMLElement[] {
  return isStretched(el) ? [el, ...inFlow(el)] : [el];
}
