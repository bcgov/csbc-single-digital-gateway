/**
 * Classes for the studio's `.grid-stack` root (doc 180 rule 16): a `form-studio-grid` marker, and a
 * dashed outline on every DIRECT item's `.grid-stack-item-content` — the box gridstack moves and
 * resizes. The outline belongs on that element itself: gridstack sizes an item from its content
 * element's first child, so a full-height bordered child could never let the item shrink. The `>`
 * chain keeps a nested grid's items styled by that grid's own root.
 *
 * Written out in full, not composed from a shared prefix: Tailwind only generates classes it finds
 * as literal strings in the source.
 */
export const STUDIO_GRID_CLASS = [
  'form-studio-grid',
  '[&>.grid-stack-item>.grid-stack-item-content]:rounded-sm',
  '[&>.grid-stack-item>.grid-stack-item-content]:border',
  '[&>.grid-stack-item>.grid-stack-item-content]:border-dashed',
  '[&>.grid-stack-item>.grid-stack-item-content]:border-border',
].join(' ');
