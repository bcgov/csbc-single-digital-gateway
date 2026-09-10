import type { GridItemHTMLElement } from 'gridstack';
import { useLayoutEffect, type RefObject } from 'react';
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

/** Resizing for a studio grid item holding an element of `type` (doc 180 rule 17d). */
export function resizingFor(type: string): StudioItemResizing {
  return type === 'Control' ? CONTROL_RESIZING : FREE_RESIZING;
}

/**
 * Gives the grid item containing `contentRef` its own resize handles (doc 180 rule 17d).
 *
 * gridstack reads an item's `gs-resize-handles` attribute only while setting up its drag/resize,
 * which happens before React portals the item's content in — so the attribute is set here, after
 * mount, and that item's drag/resize is rebuilt with a forced `prepareDragDrop`. A forced re-init
 * wires gridstack's own resize callbacks back up, unlike updating the handles option in place.
 */
export function useResizeHandles(contentRef: RefObject<HTMLElement | null>, handles: string) {
  useLayoutEffect(() => {
    const itemEl = contentRef.current?.closest<GridItemHTMLElement>('.grid-stack-item');
    const grid = itemEl?.gridstackNode?.grid;
    if (!itemEl || !grid || itemEl.getAttribute('gs-resize-handles') === handles) return;

    itemEl.setAttribute('gs-resize-handles', handles);
    grid.prepareDragDrop(itemEl, true);
  }, [contentRef, handles]);
}
