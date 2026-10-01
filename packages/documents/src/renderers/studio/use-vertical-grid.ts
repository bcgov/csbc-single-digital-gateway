import { GridStack, type GridItemHTMLElement } from 'gridstack';
import { useEffect, useLayoutEffect, useRef } from 'react';

/** The row unit item heights are counted in; heights follow content, so it only sets their granularity. */
const CELL_HEIGHT = 4;

/**
 * Elements gridstack's drag must never start from (rule 29). Its default list only matches `contenteditable="true"`,
 * so an inline-editing Heading (`plaintext-only`) would start a drag on every press.
 */
const DRAG_CANCEL = 'input,textarea,button,select,option,[contenteditable],.ui-resizable-handle';

export interface VerticalGridOptions {
  /** The authored gap in rem; gridstack's margin is half of it (rule 27). */
  gapRem: number;
  /** An editor is present: items drag vertically. Otherwise the grid is static (rule 31). */
  editable: boolean;
  /** The item keys ordered by row, after a drag. */
  onReorder: (orderedKeys: string[]) => void;
  /**
   * Each item's measured height in rows, by key — written here, owned by the caller so it outlives the grid. The caller
   * renders the NEXT grid's items at these heights, so a remount after a drop starts with every item in place.
   */
  heights: Map<string, number>;
}

/**
 * Runs gridstack over the `.grid-stack-item`s React rendered into `el` (doc 236 rules 26-31). The caller REMOUNTS `el`
 * whenever the item order changes (rule 30), so one grid only ever sees one order: React never reconciles a reorder
 * against items gridstack has positioned, and gridstack is never re-synced over DOM React has moved.
 */
export function useVerticalGrid(el: HTMLElement | null, options: VerticalGridOptions): void {
  const { gapRem, editable } = options;
  const grid = useRef<GridStack | null>(null);
  const onReorder = useRef(options.onReorder);
  onReorder.current = options.onReorder;
  const heights = options.heights;

  useLayoutEffect(() => {
    if (el === null) return;
    const instance = GridStack.init(
      {
        column: 1,
        cellHeight: CELL_HEIGHT,
        margin: `${gapRem / 2}rem`,
        float: false,
        // gridstack's own size-to-content measures with getBoundingClientRect, which xyflow's zoom scales: items
        // came out a row short and clipped. `fitItem` sizes them from unscaled layout instead (rule 28).
        sizeToContent: false,
        disableResize: true,
        acceptWidgets: false,
        staticGrid: !editable,
        draggable: { cancel: DRAG_CANCEL },
        // Off until the first fit: a new grid (one per order, rule 30) must never animate into shape. A drop remounts
        // the grid, and animating it in read as every item below the drop re-laying out.
        animate: false,
      },
      el,
    );
    if (instance === null) return;
    grid.current = instance;
    for (const item of itemsOf(el)) fitItem(instance, item, heights);
    // On only once the fitted layout has been painted, so neighbours still slide aside during a drag.
    const animateLater = requestAnimationFrame(() => instance.setAnimation(true));
    instance.on('change', () => {
      const ordered = instance.engine.nodes
        .toSorted((a, b) => (a.y ?? 0) - (b.y ?? 0))
        .flatMap((node) => (typeof node.id === 'string' ? [node.id] : []));
      onReorder.current(ordered);
    });
    return () => {
      cancelAnimationFrame(animateLater);
      grid.current = null;
      unlinkFromParentGrid(instance);
      instance.offAll();
      instance.destroy(false);
    };
    // gap and editability are applied by their own effects below, so a change never rebuilds the grid.
  }, [el]);

  useLayoutEffect(() => {
    const instance = grid.current;
    if (instance === null || el === null) return;
    instance.margin(`${gapRem / 2}rem`);
    // The margin is part of every item's height.
    for (const item of itemsOf(el)) fitItem(instance, item, heights);
  }, [el, gapRem]);

  useLayoutEffect(() => {
    grid.current?.setStatic(!editable);
  }, [editable]);

  // An item's height follows its content (rule 28) — including an inline edit that wraps a line.
  useEffect(() => {
    const instance = grid.current;
    if (instance === null || el === null) return;
    const items = itemsOf(el);
    const observer = new ResizeObserver(() => {
      for (const item of items) fitItem(instance, item, heights);
    });
    for (const item of items) {
      const child = item.querySelector(':scope > .grid-stack-item-content > *');
      if (child !== null) observer.observe(child);
    }
    return () => observer.disconnect();
  }, [el]);
}

/**
 * Sizes an item to its content (rule 28) from LAYOUT sizes — `offsetHeight` and the content's computed inset (the
 * grid margin) — which, unlike gridstack's `getBoundingClientRect`, xyflow's zoom transform does not scale.
 */
function fitItem(grid: GridStack, item: GridItemHTMLElement, heights: Map<string, number>): void {
  const content = item.querySelector<HTMLElement>(':scope > .grid-stack-item-content');
  const child = content?.firstElementChild;
  if (content === null || !(child instanceof HTMLElement)) return;
  const inset = getComputedStyle(content);
  const margins = (Number.parseFloat(inset.top) || 0) + (Number.parseFloat(inset.bottom) || 0);
  const rows = Math.max(1, Math.ceil((child.offsetHeight + margins) / CELL_HEIGHT));
  const key = item.getAttribute('gs-id');
  if (key !== null) heights.set(key, rows);
  if (item.gridstackNode !== undefined && item.gridstackNode.h !== rows)
    grid.update(item, { h: rows });
}

function itemsOf(el: HTMLElement): GridItemHTMLElement[] {
  return [...el.querySelectorAll<GridItemHTMLElement>(':scope > .grid-stack-item')];
}

/**
 * gridstack links a grid initialised inside another grid's item as that item's sub-grid. React unmounts the OUTER grid
 * first, whose destroy() deletes its `opts`, and the inner destroy() then reads them and throws (CLAUDE.md feature-180
 * trap) — so a nested grid is made a plain top-level grid before it is destroyed.
 */
function unlinkFromParentGrid(grid: GridStack): void {
  const parent = grid.parentGridNode;
  if (parent === undefined) return;
  delete parent.subGrid;
  delete grid.parentGridNode;
}
