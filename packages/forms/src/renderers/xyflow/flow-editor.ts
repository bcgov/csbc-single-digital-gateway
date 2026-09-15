import type { UISchemaElement } from '@jsonforms/core';
import { createContext, useContext } from 'react';
import type { StagePosition } from '../../types/elements';

/** Doc 196 rule 11: what an editable Flow with no Stages shows over its canvas. */
export const FLOW_EMPTY_MESSAGE = 'Add a stage from the palette.';

/**
 * A finished author gesture on an editable Flow (doc 196 rule 1). `stageId`, `flowId`, `formId` and `elementId` are the
 * editor's element ids; an edge's `source` and `target` are Stage `options.id`s.
 */
export type FlowGesture =
  | { type: 'move'; stageId: string; position: StagePosition }
  | { type: 'connect'; flowId: string; source: string; target: string }
  | { type: 'disconnect'; flowId: string; edgeIds: string[] }
  | { type: 'open'; formId: string }
  | { type: 'remove'; elementId: string };

/**
 * The port that turns a Flow into an editable one (doc 196 rules 1-2), shaped like the Grid editor. A consumer — the Form
 * Studio — provides element ids and receives every finished gesture. Without a provider a Flow is view-only (doc 195
 * rule 11), so renderers/xyflow never depends on the studio.
 */
export interface FlowEditor {
  /** A stable id for `element`. */
  idOf(element: UISchemaElement): string;
  onGesture(gesture: FlowGesture): void;
  /** `true` when a Stage drag starts, `false` when it stops (rule 4). Optional. */
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
