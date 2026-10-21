import type { GridStackHandle } from 'gridstack/dist/react';
import { useLayoutEffect, type RefObject } from 'react';

/** Marks a gridstack row that draws dividers between its items; styles.css draws them (doc 194 rule 16). */
export const DIVIDERS_ATTRIBUTE = 'data-dividers';

/**
 * Sets or removes `data-dividers` on the grid's own `.grid-stack` element (doc 194 rule 16). gridstack's React wrapper
 * takes one className per renderer factory, so a per-element flag goes on the element directly. Child layout effects
 * run first, so the grid exists; re-run on `visible`, since showing mounts a fresh grid.
 */
export function useGridDividers(
  handle: RefObject<GridStackHandle | null>,
  dividers: boolean,
  visible: boolean,
) {
  useLayoutEffect(() => {
    handle.current?.getGrid()?.el.toggleAttribute(DIVIDERS_ATTRIBUTE, dividers);
  }, [handle, dividers, visible]);
}
