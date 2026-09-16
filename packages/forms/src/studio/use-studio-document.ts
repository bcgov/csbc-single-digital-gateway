import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { GridDropSource, GridEditor, GridGesture } from '../renderers/gridstack/grid-editor';
import { allowedInLayout, type GridLayoutKind } from '../renderers/gridstack/grid-layouts';
import type { StudioItemPlacement } from '../renderers/studio/studio-selection';
import { sameJson } from './code/document-text';
import { applyInspector } from './inspector/apply-inspector';
import type { InspectorValues } from './inspector/inspector-fields';
import { inspectorForm, type InspectorForm } from './inspector/inspector-form';
import { applyLayout, applyMove } from './layout/apply-layout';
import { canvasFocusId } from './layout/canvas-focus';
import { copyElement } from './layout/copy-element';
import { addTargetId, insertElement, type InsertTarget } from './layout/insert-element';
import { createElementIds, type ElementIds } from './layout/element-ids';
import { pathSegments, type PathSegment } from './layout/element-path';
import { findById, findParentById, type TreeElement } from './layout/element-tree';
import { removeElement } from './layout/remove-element';
import { carryIdsByPath } from './layout/carry-ids-by-path';
import { newPropertyKey } from './layout/schema-properties';
import { buildTemplate } from './palette/palette-templates';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from './sample';
import { useFlowDocument, type UischemaUpdate } from './use-flow-document';

interface StudioDocumentSource {
  schema?: JsonSchema | undefined;
  uischema?: UISchemaElement | undefined;
}

/** The halves `replaceDocument` replaces — an absent half is left as it is (doc 191 rule 22). */
export type DocumentHalves = StudioDocumentSource;

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
  // Doc 194 rule 11: `accepts` reads the latest document, so the editor keeps its identity across edits.
  const latest = useRef(current);
  latest.current = current;

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

  /** Whether a dragged element or palette template may enter a layout of `layout`'s kind; unknown sources pass. */
  const accepts = useCallback(
    (layout: GridLayoutKind, source: GridDropSource) => {
      const { schema: documentSchema, uischema: documentUischema } = latest.current;
      const type =
        'elementId' in source
          ? findById(documentUischema as TreeElement, source.elementId, ids)?.type
          : buildTemplate(source.template, documentSchema)?.element.type;
      return type === undefined || allowedInLayout(type, layout);
    },
    [ids],
  );

  const editor = useMemo<GridEditor>(
    () => ({ idOf: (element) => ids.idOf(element), onGesture, accepts }),
    [ids, onGesture, accepts],
  );

  const { schema: currentSchema, uischema: currentUischema } = current;
  const elementTypes = useMemo(() => typesById(currentUischema, ids), [currentUischema, ids]);

  const updateUischema = useCallback<UischemaUpdate>((update) => {
    setState((previous) => {
      const next = update(previous.uischema);
      return next === previous.uischema ? previous : { ...previous, uischema: next };
    });
  }, []);
  // Doc 196: Flow gestures. Doc 198 rule 16: Stage and Form inserts from the on-canvas + affordances.
  const { flowEditor, insertFlowGesture } = useFlowDocument(ids, updateUischema, currentUischema);

  /** The element with `elementId` in the document, or `undefined`. */
  const elementOf = useCallback(
    (elementId: string) => findById(currentUischema as TreeElement, elementId, ids),
    [currentUischema, ids],
  );

  /** Doc 196 rule 12: the Form the canvas shows for `selectedId`, or `null` for the whole document. */
  const canvasRootOf = useCallback(
    (selectedId: string | null) => canvasFocusId(currentUischema, selectedId, ids),
    [currentUischema, ids],
  );
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

  /**
   * A clicked palette template, placed next to `selectedId` (doc 189 rules 22, 24). Doc 198 rule 19: the palette no
   * longer carries Stage or Form — a Flow is authored by the canvas + affordances — so every template is a layout one.
   */
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

  /**
   * Replaces whole halves of the document from the code editors (doc 191 rules 22-24). A half equal to the current one
   * keeps the current object (the same state object when both do); a new uischema carries ids by tree path, and the
   * seed never changes, so selection survives. Carrying inside the updater is safe to repeat (StrictMode).
   */
  const replaceDocument = useCallback(
    (next: DocumentHalves) => {
      setState((previous) => {
        const nextSchema =
          next.schema === undefined || sameJson(next.schema, previous.schema)
            ? previous.schema
            : next.schema;
        let nextUischema = previous.uischema;
        if (next.uischema !== undefined && !sameJson(next.uischema, previous.uischema)) {
          carryIdsByPath(previous.uischema, next.uischema, ids);
          nextUischema = next.uischema;
        }
        return nextSchema === previous.schema && nextUischema === previous.uischema
          ? previous
          : { ...previous, schema: nextSchema, uischema: nextUischema };
      });
    },
    [ids],
  );

  return {
    schema: currentSchema,
    uischema: currentUischema,
    seed: current.seed,
    // Doc 197: the focus address hook resolves authored Form ids to studio ids, so it needs the id registry.
    ids,
    editor,
    flowEditor,
    insertFlowGesture,
    elementTypes,
    rootId,
    parentOf,
    pathOf,
    elementOf,
    canvasRootOf,
    inspectorFor,
    updateElement,
    replaceDocument,
    copy,
    insert,
    add,
    remove,
  };
}
