import { DDManager } from 'gridstack/dist/dd-manager';
import { useSyncExternalStore } from 'react';

// Doc 260 rule 16: what is being dragged right now — a grid's item or a palette item — so a Grid can show its drop
// targets only for a drag it would take. gridstack 13.2.0 keeps the live draggable in `DDManager.dragElement` and says
// nothing to other grids (a palette drag-in fires no grid event at all), so this reads it on every pointer move.

let current: HTMLElement | null = null;
const listeners = new Set<() => void>();

/** The element gridstack is dragging, while it is MOVING; `null` otherwise. */
function read(): HTMLElement | null {
  const drag = DDManager.dragElement as { dragging?: boolean; el?: HTMLElement } | undefined;
  return drag?.dragging === true ? (drag.el ?? null) : null;
}

function refresh(): void {
  const next = read();
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

/** After gridstack's own `mouseup` handler has cleared the drag, which runs after a capture listener would. */
function refreshAfterDrop(): void {
  setTimeout(refresh, 0);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener('mousemove', refresh, { capture: true, passive: true });
    document.addEventListener('mouseup', refreshAfterDrop, { capture: true });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    document.removeEventListener('mousemove', refresh, { capture: true });
    document.removeEventListener('mouseup', refreshAfterDrop, { capture: true });
    current = null;
  };
}

const snapshot = () => current;
const serverSnapshot = () => null;

/** The element being dragged anywhere on the page, or `null` outside a drag (doc 260 rule 16). */
export function useActiveDrag(): HTMLElement | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
