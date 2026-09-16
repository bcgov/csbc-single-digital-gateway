import type { UISchemaElement } from '@jsonforms/core';
import { createContext, useContext } from 'react';

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
  | { type: 'connect'; flowId: string; source: string; target: string }
  | { type: 'disconnect'; flowId: string; edgeIds: string[] }
  | { type: 'open'; formId: string }
  | { type: 'remove'; elementId: string }
  | { type: 'append'; stageId: string | null }
  | { type: 'insert-between'; flowId: string; edgeId: string }
  | { type: 'add-form'; stageId: string };

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
  /** Whether an edge `source → target` may be added to `flow` (rule 5). */
  canConnect(flow: UISchemaElement, source: string, target: string): boolean;
}

// Kept in a module with no components, like grid-editor.ts, so components using it stay Fast Refresh-able.
const FlowEditorContext = createContext<FlowEditor | null>(null);

export const FlowEditorProvider = FlowEditorContext.Provider;

/** The editor for the Flow below, or `null` for a view-only Flow. */
export function useFlowEditor(): FlowEditor | null {
  return useContext(FlowEditorContext);
}
