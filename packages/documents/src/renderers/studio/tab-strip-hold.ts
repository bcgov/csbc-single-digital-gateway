import { DDManager } from 'gridstack/dist/dd-manager';

/** The `data-slot`s the hold reads: a studio Tabs and its strip of triggers (doc 272 rule 6b). */
export const STUDIO_TABS_SLOT = 'studio-tabs';
export const TAB_STRIP_SLOT = 'tab-strip';

/** gridstack's private leave handler (gridstack 13.2.0 — re-verify on upgrade), named once. */
const LEAVE = '_mouseLeave';

/** The part of gridstack's private `DDDroppable` the hold touches. */
interface HoldableDroppable {
  el: HTMLElement;
  [LEAVE]: (e: MouseEvent, calledByEnter?: boolean) => void;
}

/** Droppables already holding, so the wrapper never wraps itself. */
const holding = new WeakSet<object>();

/**
 * Doc 272 rule 6b: a tab's grid keeps a drag while the pointer crosses onto its Tabs' strip. Left alone, gridstack's
 * leave hands the drag to the page grid around the Tabs, which reflows under the pointer, so a drag could never rest on
 * a tab long enough to open it. The leave is skipped only when the pointer moved onto the strip of a Tabs that holds
 * this grid; `releaseTabStrip` sends it once the pointer leaves the strip for anywhere but this grid.
 *
 * gridstack binds `_mouseLeave` per instance at construction and adds it as a listener on `enable()`, so this must run
 * BEFORE the droppable is (re-)enabled — `retargetDropTarget` calls it. Installed once per droppable.
 */
export function holdOverTabStrip(droppable: unknown): void {
  const target = droppable as HoldableDroppable | undefined;
  if (target === undefined || holding.has(target)) return;
  const leave = target[LEAVE];
  target[LEAVE] = (e: MouseEvent, calledByEnter = false) => {
    if (!calledByEnter && onOwnStrip(target.el, e.relatedTarget)) return;
    leave(e, calledByEnter);
  };
  holding.add(target);
}

/** Whether `to` is on the tab strip of a studio Tabs that contains `grid`. */
function onOwnStrip(grid: HTMLElement, to: EventTarget | null): boolean {
  if (!(to instanceof Element)) return false;
  const strip = to.closest(`[data-slot="${TAB_STRIP_SLOT}"]`);
  const tabs = strip?.closest(`[data-slot="${STUDIO_TABS_SLOT}"]`);
  return tabs !== null && tabs !== undefined && tabs.contains(grid);
}

/**
 * The strip's own `mouseleave`: a held drag leaving the strip for anywhere other than the grid holding it gets the
 * leave it skipped — with gridstack's hand-off to the grid underneath.
 */
export function releaseTabStrip(event: MouseEvent): void {
  const held = DDManager.dropElement as unknown as HoldableDroppable | undefined;
  if (DDManager.dragElement === undefined || held === undefined) return;
  const to = event.relatedTarget;
  if (to instanceof Node && held.el.contains(to)) return;
  held[LEAVE](event);
}
