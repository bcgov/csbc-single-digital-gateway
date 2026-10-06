import { useEffect, useRef } from 'react';
import { dragInProgress } from './use-vertical-grid';

/** How long the pointer must rest on a tab during a drag before it opens (doc 272 rule 6). */
export const DRAG_HOVER_MS = 1000;

/**
 * Doc 272 rule 6: handlers for a tab trigger that open it once a DRAG has rested on it for `DRAG_HOVER_MS`, so the drag
 * can drop into it. Leaving first cancels; outside a drag nothing happens. `isDragging` is injectable for tests —
 * gridstack drags can't be driven in jsdom.
 */
export function useDragHover(
  open: (id: string) => void,
  isDragging: () => boolean = dragInProgress,
): {
  onPointerEnter: (id: string) => void;
  onPointerLeave: () => void;
} {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef({ open, isDragging });
  latest.current = { open, isDragging };
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    onPointerEnter: (id) => {
      clearTimeout(timer.current);
      if (!latest.current.isDragging()) return;
      timer.current = setTimeout(() => {
        if (latest.current.isDragging()) latest.current.open(id);
      }, DRAG_HOVER_MS);
    },
    onPointerLeave: () => clearTimeout(timer.current),
  };
}
