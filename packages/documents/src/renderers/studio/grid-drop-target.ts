import type { GridStack } from 'gridstack';
import { holdOverTabStrip } from './tab-strip-hold';

/** The part of gridstack's private `DDDroppable` this module touches (`eventEl` is declared `protected`). */
interface DroppableTarget {
  eventEl: HTMLElement;
  readonly disabled: boolean | undefined;
  enable(): void;
  disable(): void;
}

type DroppableHost = HTMLElement & { ddElement?: { ddDroppable?: unknown } };

/**
 * Makes a grid listen for drops on `target` — its own `.grid-stack` element unless given (doc 238 rule 13), ported from
 * `@repo/forms`' `retargetDropTarget` (its doc 190).
 *
 * gridstack 13.2.0 registers a droppable's `mouseenter`/`mouseleave` on `el.closest('.grid-stack-item')`
 * (`dd-droppable.js:21`), so a nested grid claims its parent's WHOLE item box and the outer grid never sees the pointer
 * over it — a nested VerticalLayout could not be dropped into. Moving the listeners onto the grid hands the inset
 * around it back to the outer grid; gridstack's hand-off to the parent on leave walks from `el`, so it is unaffected.
 *
 * gridstack builds a NEW droppable (targeting the item again) from its constructor, `setStatic` and `updateOptions`, so
 * this runs after each; an already-retargeted droppable is left alone. An enabled droppable's listeners move by
 * disable → retarget → enable; a disabled one only gets the new target, which its next `enable()` binds. Re-verify
 * against gridstack's `DDDroppable` on upgrade.
 */
export function retargetDropTarget(
  grid: GridStack | null | undefined,
  target?: HTMLElement | null,
): void {
  const el = grid?.el as DroppableHost | undefined;
  const droppable = el?.ddElement?.ddDroppable as DroppableTarget | undefined;
  const to = target ?? el;
  if (!el || !to || !droppable) return;
  // Doc 272 rule 6b: before any (re-)enable binds the leave listener.
  holdOverTabStrip(droppable);
  if (droppable.eventEl === to) return;
  if (droppable.disabled === true) {
    droppable.eventEl = to;
    return;
  }
  droppable.disable();
  droppable.eventEl = to;
  droppable.enable();
}

/** The `data-slot` of a studio Form's drop zone: its section, around the title and the grid (doc 238 rule 13b). */
export const FORM_DROP_ZONE_SLOT = 'form';
