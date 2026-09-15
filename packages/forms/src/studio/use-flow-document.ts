import type { UISchemaElement } from '@jsonforms/core';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FlowEditor, FlowGesture } from '../renderers/xyflow/flow-editor';
import { canConnect } from '../renderers/xyflow/flow-gestures';
import type { ElementIds } from './layout/element-ids';
import {
  connectStages,
  disconnectEdges,
  insertForm,
  insertStage,
  moveStage,
} from './layout/flow-edits';
import { newPropertyKey } from './layout/schema-properties';
import type { FlowTemplateKey } from './palette/palette-templates';

/** Replaces the studio uischema with `update(current)`; an unchanged result keeps the state object. */
export type UischemaUpdate = (update: (uischema: UISchemaElement) => UISchemaElement) => void;

/** Doc 196 rules 4, 6-7: a document gesture applied to `uischema`; `open` and `remove` belong to selection. */
export function applyFlowGesture(
  uischema: UISchemaElement,
  gesture: FlowGesture,
  ids: ElementIds,
): UISchemaElement {
  switch (gesture.type) {
    case 'move':
      return moveStage(uischema, gesture.stageId, gesture.position, ids);
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
  uischema: UISchemaElement,
) {
  const flowEditor = useMemo<FlowEditor>(
    () => ({
      idOf: (element) => ids.idOf(element),
      onGesture: (gesture) => updateUischema((current) => applyFlowGesture(current, gesture, ids)),
      canConnect: (flow, source, target) => canConnect(flow, source, target),
    }),
    [ids, updateUischema],
  );

  // Inserts into the rendered document, like `copy`, so the new element's id can be returned — and selected — at once.
  const insertFlow = useCallback(
    (template: FlowTemplateKey, selectedId: string | null): string | undefined => {
      const result =
        template === 'stage'
          ? insertStage(uischema, selectedId, ids, newPropertyKey)
          : insertForm(uischema, selectedId, ids);
      if (!result.inserted) return undefined;
      updateUischema(() => result.uischema);
      return ids.idOf(result.inserted);
    },
    [ids, uischema, updateUischema],
  );

  return { flowEditor, insertFlow };
}

/** What the selection-side Flow editor needs from the studio selection. */
export interface SelectionFlowActions {
  select(elementId: string): void;
  requestDelete(elementId: string): void;
  setGesturing(active: boolean): void;
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
      onGestureActive: (active) => latest.current.setGesturing(active),
      onGesture: (gesture) => {
        if (gesture.type === 'open') latest.current.select(gesture.formId);
        else if (gesture.type === 'remove') latest.current.requestDelete(gesture.elementId);
        else documentEditor.onGesture(gesture);
      },
    }),
    [documentEditor],
  );
}
