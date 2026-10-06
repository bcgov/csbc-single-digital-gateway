import { DDManager } from 'gridstack/dist/dd-manager';
import type { GridItemHTMLElement } from 'gridstack';
import { useEffect, useRef, type RefObject } from 'react';
import { authoredId } from './use-vertical-grid';

/** What lands in a tab from a drop on its strip (doc 272 rule 6d). */
export type StripDrop = { elementId: string } | { itemId: string };

/**
 * Doc 272 rule 6d: a drag RELEASED over the tab strip lands at the end of the tab under the pointer (else `fallback()`,
 * the shown tab) instead of wherever gridstack's held grid would put it — a hidden tab, so it seemed to vanish.
 * gridstack ends a drag in a document `mouseup` CAPTURE listener it adds at drag start; this one, added at mount,
 * runs first and reads the drag, then hands it to `land` after gridstack has finished its own drop.
 */
export function useStripDrop(
  strip: RefObject<HTMLElement | null>,
  fallback: () => string | undefined,
  land: (tabId: string, drop: StripDrop) => void,
): void {
  const latest = useRef({ fallback, land });
  latest.current = { fallback, land };
  useEffect(() => {
    const onMouseUp = (event: MouseEvent) => {
      const drag = DDManager.dragElement as { dragging?: boolean; el?: HTMLElement } | undefined;
      const target = event.target instanceof Element ? event.target : null;
      if (drag?.dragging !== true || target === null || !strip.current?.contains(target)) return;
      const tabId =
        target.closest<HTMLElement>('[data-tab-id]')?.dataset['tabId'] ?? latest.current.fallback();
      const drop = dropOf(drag.el);
      if (tabId === undefined || drop === undefined) return;
      // After gridstack's own drop and write-back, so this edit is the last word.
      setTimeout(() => latest.current.land(tabId, drop), 0);
    };
    document.addEventListener('mouseup', onMouseUp, true);
    return () => document.removeEventListener('mouseup', onMouseUp, true);
  }, [strip]);
}

/** The dragged thing: a palette item by its id, or a page element by its authored id. */
function dropOf(el: HTMLElement | undefined): StripDrop | undefined {
  const itemId = el?.getAttribute('data-palette-item');
  if (itemId) return { itemId };
  const node = (el as GridItemHTMLElement | undefined)?.gridstackNode;
  const elementId = node === undefined ? null : authoredId(node);
  return elementId === null ? undefined : { elementId };
}
