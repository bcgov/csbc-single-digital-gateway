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
 * The `grid.update` that keeps `rows` as an item's floor, or `null` when nothing changes (doc 180 rule
 * 10d, bug B1): `minH` always follows the content, and `h` follows it too — growing and shrinking —
 * except that a hand-set height (`authoredH`, the element's written `gridItem.h`) is kept while the
 * content fits in it: the target height is `max(rows, authoredH)`.
 */
export function minHeightUpdate(
  node: Pick<GridStackNode, 'h' | 'minH'>,
  rows: number,
  authoredH?: number,
): { minH: number; h?: number } | null {
  if (rows < 1) return null;
  const h = Math.max(rows, authoredH ?? rows);
  if (node.h !== h) return { minH: rows, h };
  return node.minH === rows ? null : { minH: rows };
}

/**
 * Rule 10d: fit the item's floor and height to what its content currently needs. Skipped mid-resize, so
 * a reflow from a width change never fights the person dragging a handle.
 */
function keepContentAsMinimum(itemEl: GridItemHTMLElement, authoredH: number | undefined) {
  const node = itemEl.gridstackNode as (GridStackNode & { _resizing?: boolean }) | undefined;
  const grid = node?.grid;
  const contentArea = itemEl.querySelector<HTMLElement>('.grid-stack-item-content');
  const child = contentArea?.firstElementChild;
  // eslint-disable-next-line no-underscore-dangle -- gridstack's own in-progress resize flag; no public API
  if (!node || !grid || !contentArea || !child || node._resizing) return;

  const rows = contentRows({
    itemHeight: itemEl.clientHeight,
    contentAreaHeight: contentArea.clientHeight,
    childHeight: child.getBoundingClientRect().height,
    cellHeight: grid.getCellHeight(true),
  });
  const update = minHeightUpdate(node, rows, authoredH);
  if (update) grid.update(itemEl, update);
}

/**
 * Keeps a grid item sized to its React-rendered content (doc 180 rules 10c-10d).
 *
 * The React wrapper portals item content in only AFTER gridstack has added the item, so gridstack's
 * own `sizeToContent` pass would measure an empty item (console error "firstElementChild is null …
 * Skipping sizing") and leave it one row tall, clipping the content. The Grid therefore hands
 * GridStack `sizeToContent: false` and this hook does the sizing: once the content has committed,
 * then whenever its size changes — fonts loading, rules showing/hiding children, text changes, a
 * child leaving a nested Grid, or a width change reflowing it. `sizing` picks an exact fit or a
 * content floor; `authoredH` is the element's hand-set height, kept by the floor mode.
 */
export function useSizeToContent(
  contentRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  sizing: ItemSizing = 'fit',
  authoredH?: number,
) {
  useLayoutEffect(() => {
    const content = contentRef.current;
    const itemEl = content?.closest<GridItemHTMLElement>('.grid-stack-item');
    if (!enabled || !content || !itemEl) return;

    const resize =
      sizing === 'fit'
        ? () => itemEl.gridstackNode?.grid?.resizeToContent(itemEl)
        : () => keepContentAsMinimum(itemEl, authoredH);

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(content);
    return () => observer.disconnect();
  }, [contentRef, enabled, sizing, authoredH]);
}
