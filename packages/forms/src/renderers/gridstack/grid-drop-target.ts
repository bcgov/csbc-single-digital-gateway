import type { GridStack } from 'gridstack';

/** The part of gridstack's private `DDDroppable` this module touches (`eventEl` is declared `protected`). */
interface DroppableTarget {
  eventEl: HTMLElement;
  readonly disabled: boolean | undefined;
  enable(): void;
  disable(): void;
}

type DroppableHost = HTMLElement & { ddElement?: { ddDroppable?: unknown } };

/**
 * Makes a grid listen for drops on its own `.grid-stack` element (doc 190 rules 1-4), or on `target` when given
 * (doc 201 rule 21).
 *
 * gridstack 13.2.0 registers a droppable's `mouseenter`/`mouseleave` on `el.closest('.grid-stack-item')`
 * (`dd-droppable.js:21`), so a nested grid claims its parent's whole item box. Item boxes abut, which leaves the
 * outer grid no pointer space between two nested layouts: they compete for the drag and nothing can be dropped
 * between them. Moving the listeners onto the grid itself hands the inset around it (item margin, border,
 * padding) to the outer grid. gridstack's hand-off to the parent on leave walks from `el`, so it is unaffected.
 *
 * gridstack builds a NEW droppable (targeting the item again) from its constructor, `setStatic` and
 * `updateOptions`, so this runs after every options update; an already-retargeted droppable is left alone. An
 * enabled droppable's listeners are moved by disable → retarget → enable; a disabled one only gets the new
 * target, which its next `enable()` binds. Re-verify against gridstack's `DDDroppable` on upgrade.
 */
export function retargetDropTarget(grid: GridStack | null | undefined, target?: HTMLElement): void {
  const el = grid?.el as DroppableHost | undefined;
  const droppable = el?.ddElement?.ddDroppable as DroppableTarget | undefined;
  const to = target ?? el;
  if (!el || !to || !droppable || droppable.eventEl === to) return;

  if (droppable.disabled === true) {
    droppable.eventEl = to;
    return;
  }
  droppable.disable();
  droppable.eventEl = to;
  droppable.enable();
}

/** The `data-slot` of the element around a studio Form's title, description and grid (doc 201 rule 21). */
export const FORM_DROP_ZONE_SLOT = 'form-drop-zone';

/**
 * Doc 201 rule 21: where a grid should listen for drops. A root Form's grid listens on the drop zone wrapping its title
 * and description too, so dragging over them is dragging over the grid: gridstack places by the pointer's position
 * relative to the grid element, a pointer above it gives a negative row, and the engine's `nodeBoundFix` clamps that to
 * row 0 — the FIRST slot. Every other grid listens on itself (doc 190). Scoped by the grid's own uischema type, so a
 * grid nested inside the Form never claims the zone.
 */
export function dropTargetFor(
  gridEl: HTMLElement | undefined,
  uischemaType: string,
): HTMLElement | undefined {
  if (!gridEl || uischemaType !== 'Form') return gridEl;
  return gridEl.closest<HTMLElement>(`[data-slot="${FORM_DROP_ZONE_SLOT}"]`) ?? gridEl;
}
