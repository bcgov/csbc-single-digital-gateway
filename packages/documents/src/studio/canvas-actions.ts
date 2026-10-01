import { createContext, useContext } from 'react';
import type { AddTarget } from './canvas-graph';
import type { NodeKind } from './node-edits';

/**
 * What the canvas's nodes and edges can do to the variant, by id. A context rather than callbacks in node/edge `data`,
 * so the graph stays plain data and xyflow is not handed new functions on every render.
 */
export interface CanvasActions {
  add: (target: AddTarget, kind: NodeKind) => void;
  remove: (nodeId: string) => void;
  editCondition: (conditionId: string) => void;
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null);

export function useCanvasActions(): CanvasActions {
  const actions = useContext(CanvasActionsContext);
  if (actions === null) throw new Error('useCanvasActions must be used inside DocumentCanvas');
  return actions;
}
