import type { UISchemaElement } from '@jsonforms/core';
import { createContext, useContext } from 'react';
import { useGridEditor, type GridDropSource } from './grid-editor';
import { layoutKindOf } from './grid-layouts';

/**
 * Doc 224: what is being dragged right now, so a grid can say whether it would take it.
 *
 * A context rather than another `GridEditor` method, for the same reason `GridEditor` is one: the
 * value flows DOWN to every grid on the canvas, and a renderer may never reach up into the studio
 * (`form-errors.test.ts` pins that the dependency only runs downward). The studio learns a drag
 * started through `GridEditor.onDragSource`, holds it beside the selection, and provides it back
 * here — the same round trip `selection.gesturing` already makes.
 *
 * `null` means no drag is in progress, which is the default and therefore the behaviour of every
 * consumer that never provides one.
 */
const GridDragSourceContext = createContext<GridDropSource | null>(null);

export const GridDragSourceProvider = GridDragSourceContext.Provider;

/** The drag in progress, or `null` outside one (and everywhere no provider is supplied). */
export function useGridDragSource(): GridDropSource | null {
  return useContext(GridDragSourceContext);
}

/**
 * Doc 224 rule 3: whether THIS element's box should light — it is a container, a drag is in progress,
 * and `accepts` says it would take it.
 *
 * Asked of the ELEMENT, not of its inner grid, so the whole container lights: a Section's heading and
 * padding are part of what the author is aiming at, and lighting only the drop area left the box it
 * sits in dark. The element's box is drawn in two places — `studio-grid-element` for anything inside a
 * grid, `with-studio-frame` for the root and anything else — so the rule lives here and both ask it.
 *
 * The same `accepts` the drop asks, so a lit container can never refuse; capability-aware for free,
 * since `accepts` already consults `addChildren` (doc 221).
 */
export function useDropTargetLit(element: UISchemaElement | undefined): boolean {
  const source = useGridDragSource();
  const editor = useGridEditor();
  if (source === null || editor === null || element === undefined) return false;
  const kind = layoutKindOf(element.type);
  if (kind === undefined) return false;
  return editor.accepts?.(kind, source, editor.idOf(element)) ?? true;
}
