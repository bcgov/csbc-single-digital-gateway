import type { GridItemHTMLElement, GridStackNode } from 'gridstack';
import { useLayoutEffect, type RefObject } from 'react';

/**
 * How a grid item's height follows its content (doc 180 rules 10c-10d): `'fit'` sizes it to exactly
 * its content; `'min'` keeps the content as its minimum, for items a person may resize vertically.
 */
export type ItemSizing = 'fit' | 'min';

interface ContentMeasurements {
  /** The grid item's inner height (`.grid-stack-item` clientHeight). */
  itemHeight: number;
  /** Its content area's inner height (`.grid-stack-item-content` clientHeight). */
  contentAreaHeight: number;
  /** The content area's first element child's rendered height — what the content needs. */
  childHeight: number;
  /** One grid row, in pixels. */
  cellHeight: number;
}

/**
 * Whole rows an item needs to show its content, using gridstack's own `resizeToContent` arithmetic:
 * the item/content-area difference is the margins plus any border. `0` when nothing is measurable
 * (a hidden item, jsdom, no cell height).
 */
export function contentRows({
  itemHeight,
  contentAreaHeight,
  childHeight,
  cellHeight,
}: ContentMeasurements): number {
  if (cellHeight <= 0 || childHeight <= 0) return 0;
  return Math.ceil((itemHeight - contentAreaHeight + childHeight) / cellHeight);
}

/**
 * The `grid.update` that keeps `rows` as an item's floor, or `null` when nothing changes: `minH`
 * always follows the content, and `h` is raised only when it is below it — an item never shrinks by
 * itself, so a height set by hand survives.
 */
export function minHeightUpdate(
  node: Pick<GridStackNode, 'h' | 'minH'>,
  rows: number,
): { minH: number; h?: number } | null {
  if (rows < 1) return null;
  if ((node.h ?? 0) < rows) return { minH: rows, h: rows };
  return node.minH === rows ? null : { minH: rows };
}

/** Rule 10d: raise the item's floor (and height, if needed) to what its content currently needs. */
function keepContentAsMinimum(itemEl: GridItemHTMLElement) {
  const node = itemEl.gridstackNode;
  const grid = node?.grid;
  const contentArea = itemEl.querySelector<HTMLElement>('.grid-stack-item-content');
  const child = contentArea?.firstElementChild;
  if (!node || !grid || !contentArea || !child) return;

  const rows = contentRows({
    itemHeight: itemEl.clientHeight,
    contentAreaHeight: contentArea.clientHeight,
    childHeight: child.getBoundingClientRect().height,
    cellHeight: grid.getCellHeight(true),
  });
  const update = minHeightUpdate(node, rows);
  if (update) grid.update(itemEl, update);
}

/**
 * Keeps a grid item sized to its React-rendered content (doc 180 rules 10c-10d).
 *
 * The React wrapper portals item content in only AFTER gridstack has added the item, so gridstack's
 * own `sizeToContent` pass would measure an empty item (console error "firstElementChild is null …
 * Skipping sizing") and leave it one row tall, clipping the content. The Grid therefore hands
 * GridStack `sizeToContent: false` and this hook does the sizing: once the content has committed,
 * then whenever its size changes — fonts loading, rules showing/hiding children, text changes, or a
 * width change reflowing it. `sizing` picks an exact fit or a content floor.
 */
export function useSizeToContent(
  contentRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  sizing: ItemSizing = 'fit',
) {
  useLayoutEffect(() => {
    const content = contentRef.current;
    const itemEl = content?.closest<GridItemHTMLElement>('.grid-stack-item');
    if (!enabled || !content || !itemEl) return;

    const resize =
      sizing === 'fit'
        ? () => itemEl.gridstackNode?.grid?.resizeToContent(itemEl)
        : () => keepContentAsMinimum(itemEl);

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(content);
    return () => observer.disconnect();
  }, [contentRef, enabled, sizing]);
}
