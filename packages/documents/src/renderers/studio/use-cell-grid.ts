import { GridStack, type GridItemHTMLElement, type GridStackNode } from 'gridstack';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { DropSource } from '../../studio/capabilities/governance';
import type { GridDrop, GridRect } from '../default/grid-placement';
import { GridCellEngine } from './grid-cell-engine';
import { retargetDropTarget } from './grid-drop-target';
import { installGrabOffsetClamp } from './grid-grab-offset';
import { measuredParts, naturalHeight } from './grid-natural-height';
import {
  acceptsFor,
  afterPaint,
  authoredId,
  dragInProgress,
  DRAG_CANCEL,
  itemsOf,
  unlinkFromParentGrid,
} from './use-vertical-grid';

/** An item gridstack is moving: dragged or resized. */
const MOVING = '.ui-draggable-dragging, .ui-resizable-resizing';
const MOVING_ATTRIBUTES = ['class', 'gs-x', 'gs-y', 'gs-w', 'gs-h'];

/** The least row height in px: an empty cell must still be big enough to drop on (doc 260 rule 9). */
export const MIN_CELL_PX = 64;

/** What a Grid accepts (doc 260 rule 20): what a vertical grid would, while it still has a free cell for it. */
export function cellGridAccepts(
  editable: boolean,
  grid: HTMLElement | null,
  acceptMoves: boolean,
  mayDrop: ((source: DropSource) => boolean) | undefined,
  hasFreeCell: boolean,
): false | ((el: Element) => boolean) {
  const base = acceptsFor(editable, grid, { current: acceptMoves }, { current: mayDrop });
  if (base === false) return false;
  return (el) => hasFreeCell && base(el);
}

export interface CellGridOptions {
  columns: number;
  /** The rows drawn — `effectiveRows`, both gridstack's `minRow` and `maxRow`. */
  rows: number;
  gapRem: number;
  editable: boolean;
  /** The row height to start at, in px — the last one measured, so a remount starts laid out. */
  cellHeight: number;
  onCellHeight: (px: number) => void;
  /** Every item's rectangle by key, after a move or resize within the Grid (rule 18). */
  onLayout: (rects: Map<string, GridRect>) => void;
  /**
   * Every item's LIVE rectangle while one of this Grid's own items is dragged or resized, `null` otherwise (rule 17c):
   * the rendered placement is stale until the drop is written.
   */
  onLive: (rects: Map<string, GridRect> | null) => void;
  /** A palette item dropped (rule 19): its cell, and where the items moved out of its way went. */
  onDropItem: (drop: GridDrop, itemId: string) => void;
  /** Another grid's element dropped (rule 21), likewise. */
  onMoveItem: (drop: GridDrop, elementId: string) => void;
  accepts: false | ((el: Element) => boolean);
}

/**
 * Runs gridstack over a Grid's React-rendered items (doc 260 rules 8-13). Like `useVerticalGrid`, the caller REMOUNTS
 * `el` whenever what it renders changes, so one gridstack only ever sees one layout.
 */
export function useCellGrid(el: HTMLElement | null, options: CellGridOptions): void {
  const grid = useRef<GridStack | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const { editable, gapRem } = options;
  const acceptWidgets = (on: boolean) =>
    on
      ? (item: Element) => latest.current.accepts !== false && latest.current.accepts(item)
      : false;

  useLayoutEffect(() => {
    if (el === null) return;
    installGrabOffsetClamp();
    const { columns, rows, cellHeight } = latest.current;
    const instance = GridStack.init(
      {
        column: columns,
        cellHeight,
        margin: `${gapRem / 2}rem`,
        float: true,
        sizeToContent: false,
        // Doc 260 rule 10b: every edge and corner resizes; only the corners are drawn, as brackets on the element's
        // frame (styles.css) — shown on hover or selection by CSS. gridstack derives each handle's hover auto-hide from `alwaysShowResizeHandle`
        // (a `resizable.autoHide` is overwritten), so it must be on for a selected element's brackets to show.
        resizable: { handles: 'n,ne,e,se,s,sw,w,nw' },
        alwaysShowResizeHandle: true,
        acceptWidgets: acceptWidgets(editable),
        minRow: rows,
        maxRow: rows,
        staticGrid: !editable,
        draggable: { cancel: DRAG_CANCEL },
        animate: false,
        engineClass: GridCellEngine,
      },
      el,
    );
    if (instance === null) return;
    grid.current = instance;
    // Bug B1 (doc 260 rule 13b): a grid initialised inside a live grid's item is linked as its sub-grid, and gridstack
    // 13.2.0 then dispatches the sub-grid's `change` on the OUTERMOST grid (`_triggerEvent` walks `parentGridNode`) — so
    // a Grid never heard its own moves and resizes, and nothing was written. Unlinked at once, it hears them itself.
    unlinkFromParentGrid(instance);
    retargetDropTarget(instance, instance.el);
    fitRows(instance, el, (px) => latest.current.onCellHeight(px));
    const cancelAnimate = afterPaint(() => instance.setAnimation(true));
    instance.on('dropped', (_event, previous: GridStackNode | undefined, node) =>
      handleDrop(instance, previous, node, latest.current),
    );
    instance.on('change', () => {
      // Never mid-drag (doc 243 rule 9b): a write remounts this grid under the live drag.
      if (!dragInProgress()) latest.current.onLayout(rectsOf(instance));
    });
    return () => {
      cancelAnimate();
      grid.current = null;
      unlinkFromParentGrid(instance);
      instance.offAll();
      instance.destroy(false);
    };
  }, [el]);

  useLayoutEffect(() => {
    grid.current?.margin(`${gapRem / 2}rem`);
  }, [el, gapRem]);

  useLayoutEffect(() => {
    grid.current?.setStatic(!editable);
    grid.current?.updateOptions({ acceptWidgets: acceptWidgets(editable) });
    if (grid.current !== null) retargetDropTarget(grid.current, grid.current.el);
  }, [editable]);

  // Rule 17c: gridstack sends `drag` / `resize` only to the OUTERMOST grid (`triggerEvent`), and a Grid is nested, so
  // its moves are followed through what gridstack writes on the items as they go: their gs-* attributes and classes.
  useEffect(() => {
    const instance = grid.current;
    if (instance === null || el === null) return;
    let wasLive = false;
    const observer = new MutationObserver(() => {
      const live = itemsOf(el).some((item) => item.matches(MOVING));
      if (!live && !wasLive) return;
      wasLive = live;
      latest.current.onLive(live ? rectsOf(instance) : null);
    });
    for (const item of itemsOf(el)) observer.observe(item, { attributeFilter: MOVING_ATTRIBUTES });
    return () => observer.disconnect();
  }, [el]);

  // A row follows its tallest content (rule 9) — snapped, never animated (doc 243 rule 15).
  useEffect(() => {
    const instance = grid.current;
    if (instance === null || el === null) return;
    let cancelReanimate = () => {};
    const observer = new ResizeObserver(() => {
      const animated = instance.opts.animate === true;
      if (animated) instance.setAnimation(false);
      fitRows(instance, el, (px) => latest.current.onCellHeight(px));
      if (!animated) return;
      cancelReanimate();
      cancelReanimate = afterPaint(() => instance.setAnimation(true));
    });
    for (const child of itemsOf(el).map(contentChild))
      for (const part of child === null ? [] : measuredParts(child)) observer.observe(part);
    return () => {
      cancelReanimate();
      observer.disconnect();
    };
  }, [el]);
}

/** Each item's rectangle, by its authored id. */
function rectsOf(grid: GridStack): Map<string, GridRect> {
  return new Map(
    grid.engine.nodes.flatMap((node) =>
      typeof node.id === 'string'
        ? [[node.id, { x: node.x ?? 0, y: node.y ?? 0, w: node.w ?? 1, h: node.h ?? 1 }] as const]
        : [],
    ),
  );
}

/**
 * A drop from outside (rules 19, 21): the cell is where gridstack placed the arriving node. gridstack added its helper,
 * or the source's own item, as a widget; React owns the items, so that DOM is dropped.
 */
function handleDrop(
  grid: GridStack,
  previous: GridStackNode | undefined,
  node: GridStackNode,
  { onDropItem, onMoveItem }: Pick<CellGridOptions, 'onDropItem' | 'onMoveItem'>,
): void {
  const item = node.el;
  const itemId = item?.getAttribute('data-palette-item') ?? null;
  const movedId =
    previous?.grid !== undefined && previous.grid !== grid ? authoredId(previous) : null;
  // Rule 19: the Grid's own items gridstack moved out of the way are written WITH the arrival.
  const displaced = rectsOf(grid);
  if (typeof node.id === 'string') displaced.delete(node.id);
  const drop = { x: node.x ?? 0, y: node.y ?? 0, displaced };
  if (item !== undefined) grid.removeWidget(item, true, false);
  if (itemId !== null) onDropItem(drop, itemId);
  else if (movedId !== null) onMoveItem(drop, movedId);
}

/**
 * Sizes every row to the tallest content per row it spans (rule 9), from LAYOUT sizes — the content's natural height
 * (rule 9b: the frame itself is stretched) and its computed inset — which xyflow's zoom does not scale (doc 236 rule 28).
 */
function fitRows(grid: GridStack, el: HTMLElement, report: (px: number) => void): void {
  let px = MIN_CELL_PX;
  for (const item of itemsOf(el)) {
    const content = item.querySelector<HTMLElement>(':scope > .grid-stack-item-content');
    const child = contentChild(item);
    if (content === null || child === null) continue;
    const inset = getComputedStyle(content);
    const margins = (Number.parseFloat(inset.top) || 0) + (Number.parseFloat(inset.bottom) || 0);
    const rows = item.gridstackNode?.h ?? 1;
    px = Math.max(px, Math.ceil((naturalHeight(child) + margins) / rows));
  }
  if (grid.getCellHeight(true) !== px) grid.cellHeight(px);
  report(px);
}

function contentChild(item: GridItemHTMLElement): HTMLElement | null {
  const child = item.querySelector(':scope > .grid-stack-item-content > *');
  return child instanceof HTMLElement ? child : null;
}
