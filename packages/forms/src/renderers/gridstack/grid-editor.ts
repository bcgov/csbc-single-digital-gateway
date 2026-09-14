import type { UISchemaElement } from '@jsonforms/core';
import { createContext, useContext } from 'react';

/** One grid item's placement after a gesture (doc 183 rule 9). `id` is the element id. */
export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h?: number;
  minH?: number;
}

/** A finished user gesture on an editable Grid (doc 183 rules 9-10). */
export type GridGesture =
  | {
      /** A drag or resize that stayed in one grid; `nodes` is every item of that grid. */
      type: 'layout';
      gridId: string;
      nodes: LayoutNode[];
    }
  | {
      /** An element dropped from one grid into another. */
      type: 'move';
      elementId: string;
      fromGridId: string;
      toGridId: string;
      fromNodes: LayoutNode[];
      toNodes: LayoutNode[];
    };

/**
 * The port that turns a Grid into an editable one (doc 183). A consumer — the Form Studio — provides
 * the element ids Grids key their items by and receives every finished gesture. Without a provider a
 * Grid behaves exactly as before: index-derived ids, no drops from other grids, no gesture listeners.
 */
export interface GridEditor {
  /** A stable id for `element` (also used for the Grid element itself). */
  idOf(element: UISchemaElement): string;
  onGesture(gesture: GridGesture): void;
  /**
   * `true` when a drag or resize starts on an editable Grid, `false` when it stops or its item is dropped
   * into another grid (doc 185 rule 10). Optional: a consumer that only needs finished gestures omits it.
   */
  onGestureActive?(active: boolean): void;
}

// Kept in a module with no components, like grid-context.ts, so components using it stay Fast Refresh-able.
const GridEditorContext = createContext<GridEditor | null>(null);

export const GridEditorProvider = GridEditorContext.Provider;

/** The editor for the Grids below, or `null` for a read-only / fillable form. */
export function useGridEditor(): GridEditor | null {
  return useContext(GridEditorContext);
}
