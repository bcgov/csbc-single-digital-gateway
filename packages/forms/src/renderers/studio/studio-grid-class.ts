/**
 * Classes for the studio's `.grid-stack` root (doc 180 rule 16): a `form-studio-grid` marker, and a
 * dashed outline on every DIRECT item's `.grid-stack-item-content` — the box gridstack moves and
 * resizes. The outline belongs on that element itself: gridstack sizes an item from its content
 * element's first child, so a full-height bordered child could never let the item shrink. The `>`
 * chain keeps a nested grid's items styled by that grid's own root.
 *
 * Hover and selection (doc 185 rules 3, 6) are flags on the content box's single child, the studio grid
 * item root: hovered turns the outline the ring colour, still dashed; selected turns it ring and solid.
 *
 * Every studio grid is at least 48px tall (doc 189 rule 28), so an empty layout is still a drop target for palette
 * items; CSS `min-height` wins over the height gridstack writes inline.
 *
 * Written out in full, not composed from a shared prefix: Tailwind only generates classes it finds
 * as literal strings in the source.
 */
export const STUDIO_GRID_CLASS = [
  'form-studio-grid',
  'min-h-12',
  '[&>.grid-stack-item>.grid-stack-item-content]:rounded-sm',
  '[&>.grid-stack-item>.grid-stack-item-content]:border',
  '[&>.grid-stack-item>.grid-stack-item-content]:border-dashed',
  '[&>.grid-stack-item>.grid-stack-item-content]:border-border',
  '[&>.grid-stack-item>.grid-stack-item-content:has(>[data-hovered])]:border-ring',
  '[&>.grid-stack-item>.grid-stack-item-content:has(>[data-selected])]:border-ring',
  '[&>.grid-stack-item>.grid-stack-item-content:has(>[data-selected])]:border-solid',
].join(' ');
