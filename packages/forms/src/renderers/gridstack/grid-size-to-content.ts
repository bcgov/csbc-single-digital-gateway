import type { GridItemHTMLElement } from 'gridstack';
import { useLayoutEffect, type RefObject } from 'react';

/**
 * Keeps a grid item sized to its React-rendered content (doc 180 rule 10c).
 *
 * The React wrapper portals item content in only AFTER gridstack has added the item, so gridstack's
 * own `sizeToContent` pass would measure an empty item (console error "firstElementChild is null …
 * Skipping sizing") and leave it one row tall, clipping the content. The Grid therefore hands
 * GridStack `sizeToContent: false` and this hook does the sizing: once the content has committed,
 * then whenever its size changes — fonts loading, rules showing/hiding children, text changes, or a
 * width change reflowing it.
 */
export function useSizeToContent(contentRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const content = contentRef.current;
    const itemEl = content?.closest<GridItemHTMLElement>('.grid-stack-item');
    if (!enabled || !content || !itemEl) return;

    const resize = () => {
      itemEl.gridstackNode?.grid?.resizeToContent(itemEl);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(content);
    return () => observer.disconnect();
  }, [contentRef, enabled]);
}
