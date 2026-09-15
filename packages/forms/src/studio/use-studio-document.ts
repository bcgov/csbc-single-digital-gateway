import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { useCallback, useMemo, useState } from 'react';
import type { GridEditor, GridGesture } from '../renderers/gridstack/grid-editor';
import type { StudioItemPlacement } from '../renderers/studio/studio-selection';
import { applyInspector } from './inspector/apply-inspector';
import type { InspectorValues } from './inspector/inspector-fields';
import { inspectorForm, type InspectorForm } from './inspector/inspector-form';
import { applyLayout, applyMove } from './layout/apply-layout';
import { copyElement } from './layout/copy-element';
import { addTargetId, insertElement, type InsertTarget } from './layout/insert-element';
import { createElementIds, type ElementIds } from './layout/element-ids';
import { pathSegments, type PathSegment } from './layout/element-path';
import { findParentById, type TreeElement } from './layout/element-tree';
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
      // An insert creates an element selection must pick, so the selection editor routes it to `insert` (doc 189).
      if (gesture.type === 'insert') return;
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
  // The root's id follows immutable updates because ids are carried (doc 186 rule 6).
  const rootId = ids.idOf(currentUischema);

  /** The id of the element holding `elementId`; `null` for the root or an unknown id (doc 186 rule 7). */
  const parentOf = useCallback(
    (elementId: string): string | null => {
      const parent = findParentById(currentUischema, elementId, ids);
      return parent ? ids.idOf(parent) : null;
    },
    [currentUischema, ids],
  );

  /** The breadcrumbs to `elementId`, or the root's alone (doc 186 rules 9, 20). */
  const pathOf = useCallback(
    (elementId: string | null): PathSegment[] =>
      pathSegments(currentUischema, elementId, currentSchema, ids),
    [currentUischema, currentSchema, ids],
  );

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

  // Inserts into the rendered document, like `copy`, so the new element's id can be returned — and selected — at once
  // (doc 189 rules 20-25).
  const insertInto = useCallback(
    (template: string, target: InsertTarget): string | undefined => {
      const document = { schema: currentSchema, uischema: currentUischema };
      const result = insertElement(document, template, target, ids, newPropertyKey);
      if (!result.inserted) return undefined;
      setState((previous) => ({ ...previous, schema: result.schema, uischema: result.uischema }));
      return ids.idOf(result.inserted);
    },
    [currentSchema, currentUischema, ids],
  );

  /** A palette template dropped on a grid (doc 189 rule 21). */
  const insert = useCallback(
    ({ template, gridId, placement, nodes }: Extract<GridGesture, { type: 'insert' }>) =>
      insertInto(template, { gridId, placement, nodes }),
    [insertInto],
  );

  /** A clicked palette template, placed next to `selectedId` (doc 189 rules 22, 24). */
  const add = useCallback(
    (template: string, selectedId: string | null) =>
      insertInto(template, { gridId: addTargetId(currentUischema, selectedId, ids) }),
    [insertInto, currentUischema, ids],
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

  /** The inspector form for `elementId`, or `undefined` when it is not in the document (doc 187). */
  const inspectorFor = useCallback(
    (elementId: string): InspectorForm | undefined =>
      inspectorForm({ schema: currentSchema, uischema: currentUischema }, elementId, ids),
    [currentSchema, currentUischema, ids],
  );

  /**
   * Writes inspector values back (doc 187 rules 15-22). An unchanged document keeps the same state object,
   * so JSONForms' mount emit re-renders nothing.
   */
  const updateElement = useCallback(
    (elementId: string, values: InspectorValues) => {
      setState((previous) => {
        const document = { schema: previous.schema, uischema: previous.uischema };
        const next = applyInspector(document, elementId, values, ids);
        return next === document ? previous : { ...previous, ...next };
      });
    },
    [ids],
  );

  return {
    schema: currentSchema,
    uischema: currentUischema,
    seed: current.seed,
    editor,
    elementTypes,
    rootId,
    parentOf,
    pathOf,
    inspectorFor,
    updateElement,
    copy,
    insert,
    add,
    remove,
  };
}
