import { createContext, useContext } from 'react';

/** A grid item's current engine placement (doc 185 rule 15). */
export interface StudioItemPlacement {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * The port through which a consumer — the Form Studio — gives studio grid items hover, selection and
 * element actions (doc 185), and the root element's frame hover and selection (doc 186). Ids are the Grid
 * editor's element ids (doc 183). Without a provider, studio grid items and frames render exactly as
 * before: no hover or selection state and no actions popover.
 */
export interface StudioSelection {
  readonly hoveredId: string | null;
  readonly selectedId: string | null;
  /** `true` while a drag or resize is in progress, when every actions popover hides (rule 10). */
  readonly gesturing: boolean;
  copy(elementId: string, placement: StudioItemPlacement): void;
  /**
   * Doc 221: whether a copy of `elementId` would have somewhere to go — its PARENT's `addChildren`.
   * A frame asks this to leave the Copy button out, rather than offering one that does nothing.
   */
  mayCopy?(elementId: string): boolean;
  /** Deletes the element, asking first unless the author switched confirmation off (rules 21-22). */
  requestDelete(elementId: string): void;
}

// Kept in a module with no components, like grid-editor.ts, so components using it stay Fast Refresh-able.
const StudioSelectionContext = createContext<StudioSelection | null>(null);

export const StudioSelectionProvider = StudioSelectionContext.Provider;

/** The selection port for the studio grid items below, or `null` outside the Form Studio. */
export function useSelectionPort(): StudioSelection | null {
  return useContext(StudioSelectionContext);
}
