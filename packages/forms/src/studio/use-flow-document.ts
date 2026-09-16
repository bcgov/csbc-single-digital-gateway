import type { UISchemaElement } from '@jsonforms/core';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CriterionField } from '../renderers/xyflow/criteria';
import { authoredStageId } from '../renderers/xyflow/flow-elements';
import type { FlowEditor, FlowGesture } from '../renderers/xyflow/flow-editor';
import { canConnect } from '../renderers/xyflow/flow-gestures';
import { addCriterion, removeCriterion, setCriterion } from './layout/condition-edits';
import type { ElementIds } from './layout/element-ids';
import { findById, type TreeElement } from './layout/element-tree';
import {
  connectStages,
  disconnectEdges,
  insertForm,
  insertNode,
  insertStageBetween,
  type FlowInsertResult,
} from './layout/flow-edits';
import { newPropertyKey, type StudioDocument } from './layout/schema-properties';
import { upstreamFieldsOf } from './layout/upstream-fields';

/** Replaces the studio uischema with `update(current)`; an unchanged result keeps the state object. */
export type UischemaUpdate = (update: (uischema: UISchemaElement) => UISchemaElement) => void;

/**
 * Doc 198 rule 16: the gestures that create an element, which selection routes so the new element becomes selected.
 *
 * Doc 199 rule 25: `add-criterion` is one of them. A criterion is not an element and so has no studio id of its own —
 * what becomes the selection is its CONDITION, which is also what keeps the card on screen to go on authoring it.
 */
export type FlowInsertGesture = Extract<
  FlowGesture,
  { type: 'append' | 'insert-between' | 'add-form' | 'add-criterion' }
>;

export const isFlowInsert = (gesture: FlowGesture): gesture is FlowInsertGesture =>
  gesture.type === 'append' ||
  gesture.type === 'insert-between' ||
  gesture.type === 'add-form' ||
  gesture.type === 'add-criterion';

/** Doc 199 rule 25 (amendment): the upstream fields of the Condition with `conditionId`, or `[]`. */
function fieldsOf(
  document: StudioDocument,
  conditionId: string,
  ids: ElementIds,
): CriterionField[] {
  const element = findById(document.uischema as TreeElement, conditionId, ids);
  // `upstreamFieldsOf` walks the graph, so it needs the node's AUTHORED id, not its studio one.
  const authored = element ? authoredStageId(element) : undefined;
  return authored === undefined ? [] : upstreamFieldsOf(document, authored);
}

/** Doc 198 rule 16: an inserting gesture as a pure edit of `document`. */
function applyFlowInsert(
  document: StudioDocument,
  gesture: FlowInsertGesture,
  ids: ElementIds,
): FlowInsertResult {
  const { uischema } = document;
  switch (gesture.type) {
    case 'append':
      return insertNode(
        uischema,
        gesture.stageId,
        gesture.kind,
        gesture.sourceHandle,
        ids,
        newPropertyKey,
      );
    case 'insert-between':
      return insertStageBetween(
        uischema,
        gesture.flowId,
        gesture.edgeId,
        gesture.kind,
        ids,
        newPropertyKey,
      );
    case 'add-criterion': {
      const next = addCriterion(document, gesture.conditionId, ids, newPropertyKey);
      // Rule 26: refused when nothing is upstream, and a refused edit returns the SAME document.
      if (next.uischema === uischema) return { uischema, inserted: undefined };
      return {
        uischema: next.uischema,
        inserted: findById(next.uischema as TreeElement, gesture.conditionId, ids),
      };
    }
    default:
      return insertForm(uischema, gesture.stageId, ids, newPropertyKey);
  }
}

/**
 * Doc 196 rules 6-7: a document gesture applied to `document`; `open` and `remove` belong to selection, and so do the
 * inserting gestures (doc 198 rule 16).
 *
 * Doc 199 rule 25: the criterion edits take the whole document, not just the uischema — deciding what a COMPLETE
 * criterion is needs the schema (rule 26). Neither ever changes the schema, so the uischema alone comes back.
 */
export function applyFlowGesture(
  document: StudioDocument,
  gesture: FlowGesture,
  ids: ElementIds,
): UISchemaElement {
  const { uischema } = document;
  switch (gesture.type) {
    case 'connect':
      return connectStages(
        uischema,
        gesture.flowId,
        gesture.source,
        gesture.target,
        ids,
        newPropertyKey,
      );
    case 'disconnect':
      return disconnectEdges(uischema, gesture.flowId, gesture.edgeIds, ids);
    case 'remove-criterion':
      return removeCriterion(document, gesture.conditionId, gesture.criterionId, ids).uischema;
    case 'set-criterion':
      return setCriterion(document, gesture.conditionId, gesture.criterionId, gesture.patch, ids)
        .uischema;
    default:
      return uischema;
  }
}

/**
 * The studio document's Flow half (doc 196 rules 1-2, 18-20): a Flow editor writing moves, connections and
 * disconnections back to the uischema, and palette inserts of Stages and Forms returning the new element's id.
 */
export function useFlowDocument(
  ids: ElementIds,
  updateUischema: UischemaUpdate,
  document: StudioDocument,
) {
  // The editor keeps its identity across edits (doc 189 rule 25), so the whole-document questions it answers —
  // `fieldsFor`, and the schema a criterion edit needs — read the latest document through a ref.
  const latest = useRef(document);
  latest.current = document;

  const flowEditor = useMemo<FlowEditor>(
    () => ({
      idOf: (element) => ids.idOf(element),
      onGesture: (gesture) =>
        updateUischema((current) =>
          applyFlowGesture({ schema: latest.current.schema, uischema: current }, gesture, ids),
        ),
      canConnect: (flow, source, target) => canConnect(flow, source, target),
      fieldsFor: (conditionId) => fieldsOf(latest.current, conditionId, ids),
    }),
    [ids, updateUischema],
  );

  // Doc 198 rule 16: the on-canvas + affordances, applied to the rendered document like `copy`, so the new element's id
  // can be returned — and selected — at once. Doc 196's palette-driven `insertFlow` is retired with the Flow palette
  // (rule 19); `insertNode` and `insertForm` are now reached only through gestures.
  const insertFlowGesture = useCallback(
    (gesture: FlowInsertGesture): string | undefined => {
      const result = applyFlowInsert(document, gesture, ids);
      if (!result.inserted) return undefined;
      updateUischema(() => result.uischema);
      return ids.idOf(result.inserted);
    },
    [ids, document, updateUischema],
  );

  return { flowEditor, insertFlowGesture };
}

/** What the selection-side Flow editor needs from the studio selection. */
export interface SelectionFlowActions {
  select(elementId: string): void;
  requestDelete(elementId: string): void;
  setGesturing(active: boolean): void;
  /** Doc 198 rule 16: applies an inserting gesture, returning the new element's id. */
  insert(gesture: FlowInsertGesture): string | undefined;
}

/**
 * The Flow editor the canvas receives (doc 196 rules 2, 4, 10, 13): `open` selects the Form, `remove` asks the delete
 * confirmation, drag and pan state hides the actions popovers, and every other gesture goes to the document editor.
 * The actions are read through a ref, so the editor keeps its identity and the Flow never rebuilds its props for them.
 */
export function useSelectionFlowEditor(
  documentEditor: FlowEditor,
  actions: SelectionFlowActions,
): FlowEditor {
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });
  return useMemo<FlowEditor>(
    () => ({
      idOf: (element) => documentEditor.idOf(element),
      canConnect: (flow, source, target) => documentEditor.canConnect(flow, source, target),
      fieldsFor: (conditionId) => documentEditor.fieldsFor(conditionId),
      onGestureActive: (active) => latest.current.setGesturing(active),
      onGesture: (gesture) => {
        if (gesture.type === 'open') latest.current.select(gesture.formId);
        else if (gesture.type === 'remove') latest.current.requestDelete(gesture.elementId);
        else if (isFlowInsert(gesture)) {
          // Doc 198 rule 16: an inserting gesture becomes the selection, like a dropped palette template.
          const insertedId = latest.current.insert(gesture);
          if (insertedId !== undefined) latest.current.select(insertedId);
        } else documentEditor.onGesture(gesture);
      },
    }),
    [documentEditor],
  );
}
