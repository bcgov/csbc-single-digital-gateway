import { GridStack, type GridItemHTMLElement, type GridStackNode } from 'gridstack';
import { DDManager } from 'gridstack/dist/dd-manager';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { retargetDropTarget } from './grid-drop-target';
import { installGrabOffsetClamp } from './grid-grab-offset';
import type { DropSource } from '../../studio/capabilities/governance';
import { GridNestEngine, VERTICAL_CELL_HEIGHT } from './grid-nest-engine';

/** The row unit item heights are counted in; heights follow content, so it only sets their granularity. */
const CELL_HEIGHT = VERTICAL_CELL_HEIGHT;

/**
 * Elements gridstack's drag must never start from (rule 29). Its default list only matches `contenteditable="true"`,
 * so an inline-editing Heading (`plaintext-only`) would start a drag on every press.
 */
/**
 * What a press may never drag from (doc 250 rule 13). `[contenteditable]` alone also matches `contenteditable="false"`,
 * which a read-only `RichTextView` renders — so rich content could not be dragged by its text.
 */
export const DRAG_CANCEL =
  'input,textarea,button,select,option,[contenteditable]:not([contenteditable="false"]),.ui-resizable-handle';

export interface VerticalGridOptions {
  /** The authored gap in rem; gridstack's margin is half of it (rule 27). */
  gapRem: number;
  /** An editor is present: items drag vertically. Otherwise the grid is static (rule 31). */
  editable: boolean;
  /** The item keys ordered by row, after a drag. */
  onReorder: (orderedKeys: string[]) => void;
  /** A palette item dropped in at `index` (doc 238 rule 12). */
  onDropItem: (index: number, itemId: string) => void;
  /** Another grid's item, the element with id `elementId`, dropped in at `index` (doc 243 rule 7). */
  onMoveItem: (index: number, elementId: string) => void;
  /** Whether items may arrive from other grids — the editor can move (doc 243 rule 5). */
  acceptMoves: boolean;
  /** Whether the template lets this drop in (doc 259 rules 10-11); absent: every drop the grid takes. */
  mayDrop?: ((source: DropSource) => boolean) | undefined;
  /** The least number of rows the grid keeps — an empty grid stays a drop zone (doc 238 rule 17). */
  minRow: number;
  /**
   * Where the grid listens for drops (doc 238 rule 13): an element around it — a root Form's section — or, absent,
   * the grid itself, never the enclosing item gridstack would choose.
   */
  dropZone?: ((grid: HTMLElement) => HTMLElement | null) | undefined;
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
  const onDropItem = useRef(options.onDropItem);
  onDropItem.current = options.onDropItem;
  const onMoveItem = useRef(options.onMoveItem);
  onMoveItem.current = options.onMoveItem;
  // Read by `acceptWidgets` through a ref, so a change never rebuilds the grid's options.
  const acceptMoves = useRef(options.acceptMoves);
  acceptMoves.current = options.acceptMoves;
  const mayDrop = useRef(options.mayDrop);
  mayDrop.current = options.mayDrop;
  const dropZone = useRef(options.dropZone);
  dropZone.current = options.dropZone;
  const { minRow } = options;
  const retarget = (instance: GridStack | null) => {
    if (instance !== null)
      retargetDropTarget(instance, dropZone.current?.(instance.el) ?? instance.el);
  };
  const heights = options.heights;

  useLayoutEffect(() => {
    if (el === null) return;
    // Doc 243 rule 12b: the helper's top follows the cursor, so gridstack places an item at the cursor's row — in
    // any grid it enters — and GridNestEngine can read the cursor as the drag rect's top edge.
    installGrabOffsetClamp();
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
        acceptWidgets: acceptsFor(editable, el, acceptMoves, mayDrop),
        minRow,
        staticGrid: !editable,
        draggable: { cancel: DRAG_CANCEL },
        // Off until the first fit: a new grid (one per order, rule 30) must never animate into shape. A drop remounts
        // the grid, and animating it in read as every item below the drop re-laying out.
        animate: false,
        // A nested layout never moves out from under the cursor before the cursor reaches it (doc 243 bug B1).
        engineClass: GridNestEngine,
      },
      el,
    );
    if (instance === null) return;
    grid.current = instance;
    // Doc 260 bug B1: a grid initialised inside a live grid's item is linked as its sub-grid, and gridstack 13.2.0 then
    // dispatches the sub-grid's `change` on the OUTERMOST grid — a nested layout's reorders were never written.
    unlinkFromParentGrid(instance);
    retarget(instance);
    for (const item of itemsOf(el)) fitItem(instance, item, heights);
    // On only once the fitted layout has been painted, so neighbours still slide aside during a drag.
    const cancelAnimate = afterPaint(() => instance.setAnimation(true));
    instance.on('dropped', (_event, previous: GridStackNode | undefined, node) =>
      handleDrop(instance, previous, node, {
        onDropItem: onDropItem.current,
        onMoveItem: onMoveItem.current,
      }),
    );
    instance.on('change', () => {
      // Never mid-drag (doc 243 rule 9b): a write remounts this grid under the live drag (doc 236 rule 30).
      if (dragInProgress()) return;
      const ordered = instance.engine.nodes
        .toSorted((a, b) => (a.y ?? 0) - (b.y ?? 0))
        .flatMap((node) => (typeof node.id === 'string' ? [node.id] : []));
      onReorder.current(ordered);
    });
    return () => {
      cancelAnimate();
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
    grid.current?.updateOptions({
      acceptWidgets: acceptsFor(editable, el, acceptMoves, mayDrop),
    });
    // Both build a fresh droppable on the enclosing item again.
    retarget(grid.current);
  }, [editable]);

  // An item's height follows its content (rule 28) — including an inline edit that wraps a line.
  useEffect(() => {
    const instance = grid.current;
    if (instance === null || el === null) return;
    const items = itemsOf(el);
    let cancelReanimate = () => {};
    const observer = new ResizeObserver(() => {
      // Snapped, never animated (doc 243 rule 15): a layout settling to new content — a move into a layout two levels
      // down, which remounts it but not the layout around it — rippled up the page as an animated relayout.
      // Animation is only for neighbours sliding aside mid-drag; it comes back one frame later.
      const animated = instance.opts.animate === true;
      if (animated) instance.setAnimation(false);
      for (const item of items) fitItem(instance, item, heights);
      if (!animated) return;
      cancelReanimate();
      cancelReanimate = afterPaint(() => instance.setAnimation(true));
    });
    for (const item of items) {
      const child = item.querySelector(':scope > .grid-stack-item-content > *');
      if (child !== null) observer.observe(child);
    }
    return () => {
      cancelReanimate();
      observer.disconnect();
    };
  }, [el]);
}

/**
 * A drop (doc 238 rule 12, doc 243 rule 7): a palette item is inserted, a node from ANOTHER grid moved; a palette drag
 * has no source grid. The index is the row: how many of the grid's other items sit above where it landed.
 */
function handleDrop(
  grid: GridStack,
  previous: GridStackNode | undefined,
  node: GridStackNode,
  { onDropItem, onMoveItem }: Pick<VerticalGridOptions, 'onDropItem' | 'onMoveItem'>,
): void {
  const item = node.el;
  const itemId = item?.getAttribute('data-palette-item') ?? null;
  const movedId =
    previous?.grid !== undefined && previous.grid !== grid ? authoredId(previous) : null;
  const index = grid.engine.nodes.filter(
    (other) => other !== node && (other.y ?? 0) < (node.y ?? 0),
  ).length;
  // gridstack added its drag helper — or, for a move, the source's own item — as a widget. React owns both grids'
  // items, and both remount on the new order (doc 236 rule 30), so the DOM gridstack moved is dropped.
  if (item !== undefined) grid.removeWidget(item, true, false);
  if (itemId !== null) onDropItem(index, itemId);
  else if (movedId !== null) onMoveItem(index, movedId);
}

/**
 * Runs `run` once the current layout has been PAINTED (doc 236 bug B3) — two frames, not one: a frame requested from a
 * layout effect can fire before that frame's paint, and a grid that turned its animation on there transitioned from the
 * layout `fitItem`'s measuring forced — a new item one row tall — so everything below it slid into place. Returns a
 * cancel.
 */
export function afterPaint(run: () => void): () => void {
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(run);
  });
  return () => cancelAnimationFrame(frame);
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

/**
 * What an editable grid takes (doc 238 rule 11, doc 243 rules 5-6): a palette item, and — when the editor can move —
 * another grid's item that has an authored id and does not contain this grid (a layout never drops into itself or a
 * descendant). It must refuse everything `moveElement` would: gridstack moves the DOM before `dropped`, so a drop
 * refused only at write-back leaves a ghost item.
 */
export function acceptsFor(
  editable: boolean,
  grid: HTMLElement | null,
  acceptMoves: { readonly current: boolean },
  mayDrop: { readonly current: ((source: DropSource) => boolean) | undefined },
): false | ((el: Element) => boolean) {
  if (!editable) return false;
  // Doc 259 rules 10-11: the template's rules decide HERE too, for the same ghost-item reason.
  const permits = (source: DropSource) => mayDrop.current?.(source) ?? true;
  return (el) => {
    if (el.hasAttribute('data-palette-item')) return permits({ palette: true });
    if (!acceptMoves.current || !el.classList.contains('grid-stack-item')) return false;
    const node = (el as GridItemHTMLElement).gridstackNode;
    const id = node === undefined ? null : authoredId(node);
    return id !== null && !el.contains(grid) && permits({ elementId: id });
  };
}

/**
 * Whether a drag is still MOVING (doc 243 rule 9b). gridstack fires `change` mid-drag — e.g. from `update()` when a
 * layout grows as the item enters it — and a reorder write then remounts the grid under the drag, which throws on every
 * mouse move after (`opts` of a destroyed grid) and strands the drop. `_mouseUp` clears `dragging` BEFORE the source
 * grid's stop handler fires its final `change`, so the reorder at drag end is still written. gridstack 13.2.0.
 */
export function dragInProgress(): boolean {
  const drag = DDManager.dragElement as { dragging?: boolean } | undefined;
  return drag?.dragging === true;
}

/** A node's element id — never `elementKey`'s `#<index>` fallback for an element without one. */
export function authoredId(node: GridStackNode): string | null {
  return typeof node.id === 'string' && node.id !== '' && !node.id.startsWith('#') ? node.id : null;
}

export function itemsOf(el: HTMLElement): GridItemHTMLElement[] {
  return [...el.querySelectorAll<GridItemHTMLElement>(':scope > .grid-stack-item')];
}

/**
 * gridstack links a grid initialised inside another grid's item as that item's sub-grid. React unmounts the OUTER grid
 * first, whose destroy() deletes its `opts`, and the inner destroy() then reads them and throws (CLAUDE.md feature-180
 * trap) — so a nested grid is made a plain top-level grid before it is destroyed.
 */
export function unlinkFromParentGrid(grid: GridStack): void {
  const parent = grid.parentGridNode;
  if (parent === undefined) return;
  delete parent.subGrid;
  delete grid.parentGridNode;
}
