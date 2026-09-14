import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { useCallback, useMemo, useState } from 'react';
import type { GridEditor, GridGesture } from '../renderers/gridstack/grid-editor';
import type { StudioItemPlacement } from '../renderers/studio/studio-selection';
import { applyLayout, applyMove } from './layout/apply-layout';
import { copyElement } from './layout/copy-element';
import { createElementIds, type ElementIds } from './layout/element-ids';
import type { TreeElement } from './layout/element-tree';
import { removeElement } from './layout/remove-element';
import { newPropertyKey } from './layout/schema-properties';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from './sample';

interface StudioDocumentSource {
  schema?: JsonSchema | undefined;
  uischema?: UISchemaElement | undefined;
}

interface DocumentState {
  sourceSchema: JsonSchema;
  sourceUischema: UISchemaElement;
  /** A fresh token per seeded document — the element ids restart with it. */
  seed: object;
  schema: JsonSchema;
  uischema: UISchemaElement;
}

const fromSource = (schema: JsonSchema, uischema: UISchemaElement): DocumentState => ({
  sourceSchema: schema,
  sourceUischema: uischema,
  seed: {},
  schema,
  uischema,
});

/** Every element below the root by studio id, with its uischema type (doc 185 rules 8, 21). */
function typesById(uischema: UISchemaElement, ids: ElementIds): Map<string, string> {
  const types = new Map<string, string>();
  const visit = (element: TreeElement) => {
    for (const child of element.elements ?? []) {
      types.set(ids.idOf(child), child.type);
      visit(child);
    }
  };
  visit(uischema);
  return types;
}

/**
 * The Form Studio's document (doc 183 rules 1-6, doc 185 rule 29): schema and uischema seeded from the
 * props, else the built-in sample, a Grid editor that writes finished gestures back to the uischema, and
 * copy / remove commands that update both. There is no change callback — the studio owns the document.
 * A different prop object resets it (React's "adjust state while rendering" pattern, so no render ever
 * shows the stale document).
 */
export function useStudioDocument({ schema, uischema }: StudioDocumentSource) {
  const sourceSchema = schema ?? STUDIO_SAMPLE_SCHEMA;
  const sourceUischema = uischema ?? STUDIO_SAMPLE_UISCHEMA;
  const [ids] = useState(() => createElementIds());
  const [state, setState] = useState(() => fromSource(sourceSchema, sourceUischema));

  let current = state;
  if (state.sourceSchema !== sourceSchema || state.sourceUischema !== sourceUischema) {
    ids.clear();
    current = fromSource(sourceSchema, sourceUischema);
    setState(current);
  }

  const onGesture = useCallback(
    (gesture: GridGesture) => {
      setState((previous) => ({
        ...previous,
        uischema:
          gesture.type === 'layout'
            ? applyLayout(previous.uischema, gesture.gridId, gesture.nodes, ids)
            : applyMove(previous.uischema, gesture, ids),
      }));
    },
    [ids],
  );

  const editor = useMemo<GridEditor>(
    () => ({ idOf: (element) => ids.idOf(element), onGesture }),
    [ids, onGesture],
  );

  const { schema: currentSchema, uischema: currentUischema } = current;
  const elementTypes = useMemo(() => typesById(currentUischema, ids), [currentUischema, ids]);

  // Copies from the rendered document so the copy's id can be returned — and selected — at once.
  const copy = useCallback(
    (elementId: string, placement: StudioItemPlacement): string | undefined => {
      const document = { schema: currentSchema, uischema: currentUischema };
      const result = copyElement(document, elementId, placement, ids, newPropertyKey);
      if (!result.copy) return undefined;
      setState((previous) => ({ ...previous, schema: result.schema, uischema: result.uischema }));
      return ids.idOf(result.copy);
    },
    [currentSchema, currentUischema, ids],
  );

  const remove = useCallback(
    (elementId: string) => {
      setState((previous) => ({
        ...previous,
        ...removeElement({ schema: previous.schema, uischema: previous.uischema }, elementId, ids),
      }));
    },
    [ids],
  );

  return {
    schema: currentSchema,
    uischema: currentUischema,
    seed: current.seed,
    editor,
    elementTypes,
    copy,
    remove,
  };
}
