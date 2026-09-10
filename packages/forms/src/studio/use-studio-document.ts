import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { useCallback, useMemo, useState } from 'react';
import type { GridEditor, GridGesture } from '../renderers/gridstack/grid-editor';
import { applyLayout, applyMove } from './layout/apply-layout';
import { createElementIds } from './layout/element-ids';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from './sample';

interface StudioDocumentSource {
  schema?: JsonSchema | undefined;
  uischema?: UISchemaElement | undefined;
}

interface DocumentState {
  sourceSchema: JsonSchema;
  sourceUischema: UISchemaElement;
  uischema: UISchemaElement;
}

const fromSource = (schema: JsonSchema, uischema: UISchemaElement): DocumentState => ({
  sourceSchema: schema,
  sourceUischema: uischema,
  uischema,
});

/**
 * The Form Studio's document (doc 183 rules 1-6): schema and uischema seeded from the props, else the
 * built-in sample, and a Grid editor that writes finished gestures back to the uischema. There is no
 * change callback — the studio owns the document. A different prop object resets it (React's
 * "adjust state while rendering" pattern, so no render ever shows the stale document).
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

  return { schema: current.sourceSchema, uischema: current.uischema, editor };
}
