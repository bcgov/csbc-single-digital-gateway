import { authoredId } from '../renderers/ui/authored-id';
import { mayAddTo, mayRemove } from '../capabilities/capability-gates';
import { useCapabilities } from '../renderers/studio/studio-capabilities';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { GridDropSource, GridEditor, GridGesture } from '../renderers/gridstack/grid-editor';
import { allowedInLayout, type GridLayoutKind } from '../renderers/gridstack/grid-layouts';
import type { CapabilityMap } from '../capabilities/capability-types';
import type { StudioItemPlacement } from '../renderers/studio/studio-selection';
import { FLOW_TYPE, flowNodeKind } from '../renderers/xyflow/flow-elements';
import { sameJson } from './code/document-text';
import { applyInspector } from './inspector/apply-inspector';
import { inspectorContext } from './inspector/inspector-context';
import { applyPermissions, isPermissionKey } from './inspector/permission-fields';
import type { InspectorValues } from './inspector/inspector-fields';
import { inspectorForm, type InspectorForm } from './inspector/inspector-form';
import { applyLayout, applyMove } from './layout/apply-layout';
import { canvasFocusId } from './layout/canvas-focus';
import { copyElement } from './layout/copy-element';
import { addTargetId, insertElement, type InsertTarget } from './layout/insert-element';
import { createElementIds, type ElementIds } from './layout/element-ids';
import { elementPath, pathSegments, type PathSegment } from './layout/element-path';
import { findById, findParentById, type TreeElement } from './layout/element-tree';
import { joinsNeighbours } from './layout/node-join';
import { removeElement } from './layout/remove-element';
import { setChoices } from './layout/set-choices';
import { carryIdsByPath } from './layout/carry-ids-by-path';
import { newPropertyKey } from './layout/schema-properties';
import { stampMissingIds } from './layout/stamp-ids';
import type { SavedEntry } from './options/option-draft';
import { buildTemplate } from './palette/palette-templates';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from './sample';
import { useFlowDocument, type UischemaUpdate } from './use-flow-document';
import { useTabsDocument } from './use-tabs-document';

interface StudioDocumentSource {
  schema?: JsonSchema | undefined;
  uischema?: UISchemaElement | undefined;
  /**
   * Doc 220: the capability map, on a TEMPLATE. Its PRESENCE — even as `{}` — is what tells the studio
   * this document's permissions are authorable; a document page seeds none and the Permissions section
   * never appears. No separate prop: the package's existing "presence enables it" idiom.
   */
  capabilities?: CapabilityMap | undefined;
  /**
   * Doc 221 rule 6: said when the studio REFUSES an edit the author already committed to.
   *
   * Absent affordances say nothing — nothing was attempted. A DRAG is different: by the time it
   * fails the author has already picked the element up, and a silent snap-back is the shape users
   * report as a bug. Same channel doc 209 rule 18 uses for a refused edge re-point.
   */
  onNotice?: ((message: string) => void) | undefined;
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
  /**
   * Doc 220: its OWN slice, never part of the edited halves. `undefined` means this document has no
   * capability map at all (an ordinary document, not a template) — distinct from `{}`, which means a
   * template whose author has not written any rule yet.
   */
  capabilities: CapabilityMap | undefined;
}

/**
 * Doc 219: the working uischema is NORMALISED — every id-less element is stamped as it is seeded.
 *
 * Here, and nowhere later, for two reasons. This is where the BASELINE is computed, so the stamped document
 * IS the baseline: `onDocumentChange`'s mount emission already carries the ids, the host's dirty check
 * compares against the stamped version, and opening a template without editing it stays clean. Stamping in
 * an effect or on save would instead dirty a document merely by opening it and bump its revision for no
 * authored change.
 *
 * `sourceUischema` keeps the RAW prop, never the stamped copy — it is the identity the re-seed comparison
 * below reads, and swapping in a new object here would make every render look like a new document.
 */
const fromSource = (
  schema: JsonSchema,
  uischema: UISchemaElement,
  capabilities: CapabilityMap | undefined,
): DocumentState => ({
  sourceSchema: schema,
  sourceUischema: uischema,
  seed: {},
  schema,
  uischema: stampMissingIds(uischema),
  capabilities,
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
/** Doc 221 rule 6: the one message a refused drag shows. */
const MOVE_REFUSED = 'This form’s template does not allow moving that element.';

export function useStudioDocument({
  schema,
  uischema,
  capabilities,
  onNotice,
}: StudioDocumentSource) {
  const sourceSchema = schema ?? STUDIO_SAMPLE_SCHEMA;
  const sourceUischema = uischema ?? STUDIO_SAMPLE_UISCHEMA;
  const [ids] = useState(() => createElementIds());
  const [state, setState] = useState(() => fromSource(sourceSchema, sourceUischema, capabilities));

  let current = state;
  // Doc 220: `capabilities` is deliberately NOT part of this condition. `ids.clear()` below destroys
  // every element id and the author's selection, and capabilities arrive from the same `content`
  // object as the other two halves — so a real version change moves all three together. A third
  // `!==` would buy nothing and hand a host a third way to re-seed by accident (doc 218's trap).
  if (state.sourceSchema !== sourceSchema || state.sourceUischema !== sourceUischema) {
    ids.clear();
    current = fromSource(sourceSchema, sourceUischema, capabilities);
    setState(current);
  }
  // Doc 194 rule 11: `accepts` reads the latest document, so the editor keeps its identity across edits.
  const latest = useRef(current);
  latest.current = current;
  /**
   * Doc 221: the GOVERNING map, held in a ref for the same reason `latest` is — the write gates below
   * read it, and a new dependency would change `accepts`'s identity, reload every grid, and (doc 218)
   * put the map within reach of the re-seed comparison. Ungoverned is `null`, which every gate treats
   * as fully granted.
   */
  const governing = useCapabilities();
  const governingRef = useRef(governing);
  governingRef.current = governing;
  // Held in a ref like the rest: a new identity would rebuild the editor on every render.
  const noticeRef = useRef(onNotice);
  noticeRef.current = onNotice;

  const onGesture = useCallback(
    (gesture: GridGesture) => {
      // An insert creates an element selection must pick, so the selection editor routes it to `insert` (doc 189).
      if (gesture.type === 'insert') return;
      setState((previous) => {
        const next =
          gesture.type === 'layout'
            ? applyLayout(previous.uischema, gesture.gridId, gesture.nodes, ids)
            : applyMove(previous.uischema, gesture, ids, governingRef.current ?? undefined);
        // A move that comes back UNCHANGED under a governing template was refused by a capability.
        // The author already committed to the gesture, so this one says why (rule 6).
        if (
          gesture.type === 'move' &&
          next === previous.uischema &&
          governingRef.current !== null
        ) {
          noticeRef.current?.(MOVE_REFUSED);
        }
        return { ...previous, uischema: next };
      });
    },
    [ids],
  );

  /**
   * Whether a dragged element or palette template may enter the layout `layoutId` (of kind `layout`); unknown
   * sources pass. Doc 216 rules 11-12: the drop gate is given the layout's ID, so it can walk the ancestor types
   * down to it — a Tabs may not enter a layout that sits inside a Tab.
   */
  const accepts = useCallback(
    (layout: GridLayoutKind, source: GridDropSource, layoutId: string) => {
      const { schema: documentSchema, uischema: documentUischema } = latest.current;
      const root = documentUischema as TreeElement;
      const type =
        'elementId' in source
          ? findById(root, source.elementId, ids)?.type
          : buildTemplate(source.template, documentSchema)?.element.type;
      if (type === undefined) return true;
      if (
        !allowedInLayout(
          type,
          layout,
          elementPath(root, layoutId, ids).map((element) => element.type),
        )
      )
        return false;
      // Doc 221: refusing only in write-back would leave gridstack's DOM moved — a ghost item — so the
      // capability is asked HERE too, exactly as doc 194 rule 8 requires of the placement rule.
      const target = findById(root, layoutId, ids);
      return target === undefined || mayAddTo(governingRef.current ?? undefined, target);
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
  // Doc 199 rule 25: criterion edits and the card's field picker need the SCHEMA too, so the Flow half is
  // given the whole document rather than the uischema alone.
  const flowDocument = useMemo(
    () => ({ schema: currentSchema, uischema: currentUischema }),
    [currentSchema, currentUischema],
  );
  const { flowEditor, insertFlowGesture, repointFlowEdge } = useFlowDocument(
    ids,
    updateUischema,
    flowDocument,
  );
  // Doc 216 rules 16-19: the tab strip's document half. Its own file, since this one is already over the
  // 300-line gate — and it needs the uischema alone, never the schema.
  const { tabsEditor, insertTab, openTabFor } = useTabsDocument(
    ids,
    updateUischema,
    currentUischema,
  );

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
      // Doc 221: a copy needs somewhere to GO, so it is the PARENT's `addChildren` that decides — the
      // reason the toolbar cannot gate Copy itself (it is presentational and has no parent to resolve).
      const parentId = parentOf(elementId);
      const parent =
        parentId === null
          ? (currentUischema as TreeElement)
          : findById(currentUischema as TreeElement, parentId, ids);
      if (parent && !mayAddTo(governingRef.current ?? undefined, parent)) return undefined;
      const result = copyElement(document, elementId, placement, ids, newPropertyKey);
      if (!result.copy) return undefined;
      setState((previous) => ({ ...previous, schema: result.schema, uischema: result.uischema }));
      return ids.idOf(result.copy);
    },
    [currentSchema, currentUischema, ids, parentOf],
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

  /**
   * Doc 210 rule 8b: whether deleting `elementId` would JOIN its neighbours. The delete confirmation says what
   * goes with the element, and "its connections will be removed" stops being true for a node in a chain.
   *
   * Only a Flow node at the Flow root can join; anything else answers `false` without touching the graph.
   */
  const joinsOnDelete = useCallback(
    (elementId: string): boolean => {
      const root = currentUischema as TreeElement;
      if (root.type !== FLOW_TYPE) return false;
      const element = findById(root, elementId, ids);
      if (!element || flowNodeKind(element) === undefined) return false;
      const authored = authoredId(element);
      return authored !== undefined && joinsNeighbours(root, authored);
    },
    [currentUischema, ids],
  );

  const remove = useCallback(
    (elementId: string) => {
      setState((previous) => {
        // Doc 221: refused defensively even though the button is already absent — `requestDelete` is
        // reachable from the Flow gestures and the keyboard too, and a gate that only hides a control
        // is not a gate.
        const root = previous.uischema as TreeElement;
        const element = findById(root, elementId, ids);
        const parentId = findParentById(root, elementId, ids);
        const parent = parentId === undefined ? undefined : parentId;
        if (element && !mayRemove(governingRef.current ?? undefined, element, parent)) {
          return previous;
        }
        return {
          ...previous,
          ...removeElement(
            { schema: previous.schema, uischema: previous.uischema },
            elementId,
            ids,
          ),
        };
      });
    },
    [ids],
  );

  /** The inspector form for `elementId`, or `undefined` when it is not in the document (doc 187). */
  const inspectorFor = useCallback(
    (elementId: string): InspectorForm | undefined =>
      inspectorForm(
        { schema: currentSchema, uischema: currentUischema },
        elementId,
        ids,
        // `exactOptionalPropertyTypes`: an absent map is an absent KEY, never an explicit undefined.
        current.capabilities === undefined ? {} : { authored: current.capabilities },
      ),
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
        // Doc 220: the Permissions fields write the capability MAP, not the element, so their values
        // are split off BEFORE `applyInspector` — which takes and returns an `EditableDocument` that
        // cannot carry capabilities by design. Splitting here is what keeps the map out of the edit
        // pipeline that would silently drop it.
        const elementValues: InspectorValues = {};
        const permissionValues: InspectorValues = {};
        for (const [key, value] of Object.entries(values)) {
          if (isPermissionKey(key)) permissionValues[key] = value;
          else elementValues[key] = value;
        }

        const next = applyInspector(document, elementId, elementValues, ids);
        const ctx =
          previous.capabilities === undefined
            ? undefined
            : inspectorContext(document, elementId, ids);
        const nextCapabilities =
          ctx && previous.capabilities
            ? applyPermissions(previous.capabilities, ctx, permissionValues)
            : previous.capabilities;

        // Both halves unchanged: the SAME state object, so the canvas does not re-render (rule 7).
        if (next === document && nextCapabilities === previous.capabilities) return previous;
        return { ...previous, ...next, capabilities: nextCapabilities };
      });
    },
    [ids],
  );

  /**
   * Doc 206 rules 26-28: writes a choice field's option list, cascading any renamed const into the Flow
   * Condition clauses that hold it — in ONE update, or `clause-edits.ts` would refuse the repair.
   *
   * Beside `updateElement` rather than through it: `applyInspector` reads a missing key as "cleared", and
   * `fieldAccepts` refuses an array outright, so the option list can never ride the JSONForms data channel.
   */
  const updateOptions = useCallback(
    (
      elementId: string,
      entries: readonly SavedEntry[],
      renames: ReadonlyMap<string | number, string | number>,
    ) => {
      setState((previous) => {
        const document = { schema: previous.schema, uischema: previous.uischema };
        const next = setChoices(document, elementId, entries, renames, ids);
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
          // Doc 219: `replaceDocument` is the OTHER whole-document entry point (the code panel's apply), so it
          // normalises too — otherwise a pasted document, or one whose ids the author deleted in the panel,
          // would leave the open document with id-less elements and nothing to re-stamp them.
          const stamped = stampMissingIds(next.uischema);
          carryIdsByPath(previous.uischema, stamped, ids);
          nextUischema = stamped;
        }
        return nextSchema === previous.schema && nextUischema === previous.uischema
          ? previous
          : { ...previous, schema: nextSchema, uischema: nextUischema };
      });
    },
    [ids],
  );

  /**
   * Doc 220: the Permissions inspector's write path. Capabilities never travel through the pure edit
   * pipeline (see `EditableDocument`), so they are set here directly — and an update that changes
   * nothing returns the SAME state object, for the reason `applyInspector` does: a new object on
   * every pass re-renders the canvas on every selection.
   */
  const setCapabilities = useCallback((next: CapabilityMap) => {
    setState((previous) =>
      sameJson(next, previous.capabilities) ? previous : { ...previous, capabilities: next },
    );
  }, []);

  return {
    schema: currentSchema,
    uischema: currentUischema,
    capabilities: current.capabilities,
    setCapabilities,
    seed: current.seed,
    // Doc 197: the focus address hook resolves authored Form ids to studio ids, so it needs the id registry.
    ids,
    editor,
    flowEditor,
    insertFlowGesture,
    repointFlowEdge,
    tabsEditor,
    insertTab,
    openTabFor,
    elementTypes,
    rootId,
    parentOf,
    pathOf,
    elementOf,
    canvasRootOf,
    joinsOnDelete,
    inspectorFor,
    updateElement,
    updateOptions,
    replaceDocument,
    copy,
    insert,
    add,
    remove,
  };
}
