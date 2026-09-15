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
 * Makes a grid listen for drops on its own `.grid-stack` element (doc 190 rules 1-4).
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
export function retargetDropTarget(grid: GridStack | null | undefined): void {
  const el = grid?.el as DroppableHost | undefined;
  const droppable = el?.ddElement?.ddDroppable as DroppableTarget | undefined;
  if (!el || !droppable || droppable.eventEl === el) return;

  if (droppable.disabled === true) {
    droppable.eventEl = el;
    return;
  }
  droppable.disable();
  droppable.eventEl = el;
  droppable.enable();
}
