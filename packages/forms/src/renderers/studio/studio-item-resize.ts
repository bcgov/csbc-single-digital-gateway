import type { GridItemHTMLElement } from 'gridstack';
import { useLayoutEffect, type RefObject } from 'react';
import type { GridLayoutKind } from '../gridstack/grid-layouts';
import type { ItemSizing } from '../gridstack/grid-size-to-content';

/** How a studio grid item may be resized, and how its height follows its content. */
export interface StudioItemResizing {
  /** gridstack resize handles, as a `gs-resize-handles` value. */
  readonly handles: string;
  readonly sizing: ItemSizing;
}

// A Control's height is always exactly its content, so only its width can be dragged.
const CONTROL_RESIZING: StudioItemResizing = Object.freeze({ handles: 'e, w', sizing: 'fit' });
// Everything else resizes from every edge and corner; its content stays the floor, so it can be made
// taller but never shorter than its content — from the top too, which moves the item's row.
const FREE_RESIZING: StudioItemResizing = Object.freeze({
  handles: 'n, ne, e, se, s, sw, w, nw',
  sizing: 'min',
});

// A VerticalLayout's items only drag: no handles (its grid also disables resizing), height fits.
const NO_RESIZING: StudioItemResizing = Object.freeze({ handles: '', sizing: 'fit' });

/**
 * Resizing for a studio item holding an element of `type`, inside a `layout` (doc 180 rules 17d, 30):
 * a Grid decides by element type; every item of a HorizontalLayout resizes sideways only, like a
 * Control; a VerticalLayout's items do not resize.
 */
export function resizingFor(type: string, layout: GridLayoutKind): StudioItemResizing {
  if (layout === 'vertical') return NO_RESIZING;
  if (layout === 'horizontal') return CONTROL_RESIZING;
  return type === 'Control' ? CONTROL_RESIZING : FREE_RESIZING;
}

/**
 * Gives the grid item containing `contentRef` its own resize handles (doc 180 rule 17d).
 *
 * gridstack reads an item's `gs-resize-handles` attribute only while setting up its drag/resize,
 * which happens before React portals the item's content in — so the attribute is set here, after
 * mount, and that item's drag/resize is rebuilt with a forced `prepareDragDrop`. A forced re-init
 * wires gridstack's own resize callbacks back up, unlike updating the handles option in place.
 * No `handles` (`''`, an item that does not resize) → nothing to set.
 */
export function useResizeHandles(contentRef: RefObject<HTMLElement | null>, handles: string) {
  useLayoutEffect(() => {
    const itemEl = contentRef.current?.closest<GridItemHTMLElement>('.grid-stack-item');
    const grid = itemEl?.gridstackNode?.grid;
    if (!handles || !itemEl || !grid || itemEl.getAttribute('gs-resize-handles') === handles)
      return;

    itemEl.setAttribute('gs-resize-handles', handles);
    grid.prepareDragDrop(itemEl, true);
  }, [contentRef, handles]);
}

/**
 * Doc 221: applies a governing template's `move` / `reorderChildren` to the grid item itself.
 *
 * gridstack owns whether an item can be dragged or resized, and it decides that from the NODE, not
 * from React — so a capability has to be written onto the node. `grid.update` is the supported way
 * to change a live node's flags, and it is idempotent, so re-running on every render costs nothing.
 *
 * This lives in a STUDIO module on purpose. `renderers/gridstack` is shared with the fillable
 * renderers and must stay capability-agnostic; the studio item is the first place that knows both
 * the element and what governs it.
 *
 * Refusing in the ENGINE as well as in write-back matters: a gate that only refuses on write-back
 * leaves gridstack's DOM moved — a ghost item the author sees snap back — which doc 194 rule 8
 * already records for the placement rule.
 */
export function useItemPermissions(
  contentRef: RefObject<HTMLElement | null>,
  { canMove, canResize }: { readonly canMove: boolean; readonly canResize: boolean },
) {
  useLayoutEffect(() => {
    const itemEl = contentRef.current?.closest<GridItemHTMLElement>('.grid-stack-item');
    const node = itemEl?.gridstackNode;
    const grid = node?.grid;
    if (!itemEl || !grid || !node) return;
    if (node.noMove === !canMove && node.noResize === !canResize) return;
    grid.update(itemEl, { noMove: !canMove, noResize: !canResize });
  }, [contentRef, canMove, canResize]);
}
