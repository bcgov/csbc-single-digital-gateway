import type { UISchemaElement } from '@jsonforms/core';
import { createContext, useContext } from 'react';
import type { Clause, ConditionRow } from '../../types/elements';
import type { CriterionField } from './criteria';
import type { FlowNodeKind } from './flow-elements';
import type { EdgePatch } from './flow-gestures';

/**
 * Doc 196 rule 11, amended by doc 198 rule 12: what an editable Flow with no Stages shows over its canvas. The palette
 * is no longer reachable from the Flow canvas, so the message names no panel — an origin + sits beneath it.
 */
export const FLOW_EMPTY_MESSAGE = 'Add a stage to get started.';

/**
 * A finished author gesture on an editable Flow (doc 196 rule 1, doc 198 rule 16). `stageId`, `flowId`, `formId` and
 * `elementId` are the editor's element ids; an edge's `source` and `target` are Stage `options.id`s, and `edgeId` is a
 * Flow `options.edges` id.
 *
 * `append`, `insert-between` and `add-form` are INSERTING gestures: like the Grid editor's `insert`, each produces a new
 * element that becomes the selection, so the studio routes them through selection rather than straight to the document.
 * `append` with a `null` stageId is the empty-Flow origin + (rule 12).
 */
export type FlowGesture =
  /** Doc 199 rule 45c: `sourceHandle` is the ROW the drag started at — absent for a Stage and for Else. */
  | { type: 'connect'; flowId: string; source: string; target: string; sourceHandle?: string }
  | { type: 'disconnect'; flowId: string; edgeIds: string[] }
  /**
   * Doc 209 rules 1-2: which edge xyflow now has selected, or `null` for none. The canvas OWNS edge
   * selection — doc 196 rule 1 put edges in `useEdgesState` so click-select and Delete work — so this reports
   * it rather than asking to be given it, and the studio's `selectedEdgeId` follows.
   */
  | { type: 'select-edge'; flowId: string; edgeId: string | null }
  /** Doc 209 rule 19: an edge end dragged onto another node. The same edit the inspector's panel makes. */
  | { type: 'repoint'; flowId: string; edgeId: string; patch: EdgePatch }
  | { type: 'open'; formId: string }
  | { type: 'remove'; elementId: string }
  /**
   * Doc 199 rule 24: a + appends either kind of node. `sourceHandle` is the ROW the new edge leaves by
   * (rule 20) — absent for a Stage source and for a Condition's default output, which is what the stored form
   * of a default edge is (rule 18).
   */
  | { type: 'append'; stageId: string | null; kind: FlowNodeKind; sourceHandle?: string }
  | { type: 'insert-between'; flowId: string; edgeId: string; kind: FlowNodeKind }
  | { type: 'add-form'; stageId: string }
  /**
   * Doc 199 rules 25, 48: the six row and clause edits. `conditionId` is the Condition's ELEMENT id, like
   * `add-form`'s `stageId`; `rowId` and `clauseId` are the authored ids inside it, and a row's id is also the
   * `sourceHandle` of the edge leaving that branch (rule 37).
   *
   * `add-row` and `add-clause` are INSERTING gestures routed through selection; the rest are document gestures.
   */
  | { type: 'add-row'; conditionId: string }
  | { type: 'remove-row'; conditionId: string; rowId: string }
  | {
      type: 'set-row';
      conditionId: string;
      rowId: string;
      patch: Partial<Pick<ConditionRow, 'label' | 'match'>>;
    }
  /** Rule 49: `toIndex` is the position among the rows AFTER the move, so 0 is first. */
  | { type: 'move-row'; conditionId: string; rowId: string; toIndex: number }
  /** Rule 51: the header's mode toggle. Nothing about the rows changes — only how they are shown. */
  | { type: 'set-mode'; conditionId: string; mode: 'rules' | 'switch' }
  | { type: 'add-clause'; conditionId: string; rowId: string }
  | { type: 'remove-clause'; conditionId: string; rowId: string; clauseId: string }
  | {
      type: 'set-clause';
      conditionId: string;
      rowId: string;
      clauseId: string;
      patch: Partial<Omit<Clause, 'id'>>;
    };

/**
 * The port that turns a Flow into an editable one (doc 196 rules 1-2), shaped like the Grid editor. A consumer — the Form
 * Studio — provides element ids and receives every finished gesture. Without a provider a Flow is view-only (doc 195
 * rule 11), so renderers/xyflow never depends on the studio.
 */
export interface FlowEditor {
  /** A stable id for `element`. */
  idOf(element: UISchemaElement): string;
  onGesture(gesture: FlowGesture): void;
  /** `true` when a pan or zoom starts, `false` when it stops (doc 196 rule 4). Optional. */
  onGestureActive?(active: boolean): void;
  /**
   * WHY an edge `source → target` may not be added to `flow`, or `undefined` when it may (rule 5, reshaped by
   * doc 209 rule 14). `sourceHandle` is the output it would leave by, which decides whether it duplicates an
   * existing edge (doc 199 rules 11, 45c); `exceptEdgeId` is the edge being RE-POINTED, which must not read as
   * a duplicate of itself.
   *
   * A boolean here carried no reason, and doc 209 rule 15 has to tell the author why an edit snapped back.
   */
  connectionProblem(
    flow: UISchemaElement,
    source: string,
    target: string,
    sourceHandle?: string | null,
    exceptEdgeId?: string,
  ): string | undefined;
  /**
   * Doc 199 rule 25 (amendment): the fields the Condition with `conditionId` may test — those answerable
   * before it (rule 6). The popover's field picker has no other route to them: `FlowContext` carries only
   * JSONForms dispatch props, and `upstreamFieldsOf` lives in the studio, which `renderers/xyflow` may never
   * import. Like `connectionProblem`, it delegates a whole-document question to the consumer.
   */
  fieldsFor(conditionId: string): readonly CriterionField[];
}

// Kept in a module with no components, like grid-editor.ts, so components using it stay Fast Refresh-able.
const FlowEditorContext = createContext<FlowEditor | null>(null);

export const FlowEditorProvider = FlowEditorContext.Provider;

/** The editor for the Flow below, or `null` for a view-only Flow. */
export function useFlowEditor(): FlowEditor | null {
  return useContext(FlowEditorContext);
}
