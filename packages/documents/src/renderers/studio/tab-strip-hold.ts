import { DDManager } from 'gridstack/dist/dd-manager';

/** The `data-slot`s the hold reads: a studio Tabs and its strip of triggers (doc 272 rule 6b), a studio Card (doc 273). */
export const STUDIO_TABS_SLOT = 'studio-tabs';
export const TAB_STRIP_SLOT = 'tab-strip';
export const STUDIO_CARD_SLOT = 'studio-card';

/** The containers that hold a drag in their own grids: the nearest one around a grid decides. */
const HOLDING = `[data-slot="${STUDIO_TABS_SLOT}"], [data-slot="${STUDIO_CARD_SLOT}"]`;

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
 * Doc 272 rule 6b: a tab's grid keeps a drag while the pointer stays inside its Tabs. Left alone, gridstack's leave
 * hands the drag to the page grid around the Tabs, which reflows under the pointer, so a drag could never rest on a tab
 * long enough to open it. The hold covers the WHOLE Tabs — strip, the gap above the panel, the panel's edges — not just
 * the strip: the pointer crosses that gap first on its way up, and an unheld leave there slid the strip away (found by
 * hand). `releaseTabStrip`, the Tabs' own `mouseleave`, sends the skipped leave once the pointer leaves the Tabs.
 *
 * gridstack binds `_mouseLeave` per instance at construction and adds it as a listener on `enable()`, so this must run
 * BEFORE the droppable is (re-)enabled — `retargetDropTarget` calls it. Installed once per droppable.
 */
export function holdOverTabStrip(droppable: unknown): void {
  const target = droppable as HoldableDroppable | undefined;
  if (target === undefined || holding.has(target)) return;
  const leave = target[LEAVE];
  target[LEAVE] = (e: MouseEvent, calledByEnter = false) => {
    if (!calledByEnter && insideOwnTabs(target.el, e.relatedTarget)) return;
    leave(e, calledByEnter);
  };
  holding.add(target);
}

/** Whether `to` is inside the NEAREST studio Tabs or Card holding `grid` (outside the grid itself — that is no leave). */
function insideOwnTabs(grid: HTMLElement, to: EventTarget | null): boolean {
  if (!(to instanceof Element)) return false;
  // Doc 273 B1: a Card holds too — leaving its footer grid for its content crossed the gap between them, the page grid
  // took the drag there and drew its drop zone under the Card.
  const holder = grid.closest(HOLDING);
  return holder !== null && holder.contains(to) && !grid.contains(to);
}

/**
 * The Tabs' own `mouseleave`: a held drag leaving the Tabs gets the leave it skipped — with gridstack's hand-off to the
 * grid underneath. Back into the holding grid (it cannot be, from outside the Tabs, but cheap to guard) is no leave.
 */
export function releaseTabStrip(event: MouseEvent): void {
  const held = DDManager.dropElement as unknown as HoldableDroppable | undefined;
  if (DDManager.dragElement === undefined || held === undefined) return;
  const to = event.relatedTarget;
  if (to instanceof Node && held.el.contains(to)) return;
  held[LEAVE](event);
}
