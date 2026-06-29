import { createContext, useContext } from 'react';
import type { MultiStageDefinition } from './stage-model';

/** Handlers + state shared from `StageBuilder` to the custom xyflow `StageNode`s (avoids threading
 * callbacks through node `data`, which churns on every edit). */
export interface StageBuilderApi {
  def: MultiStageDefinition;
  addPage: (stageId: string) => void;
  removePage: (stageId: string, pageId: string) => void;
  reorderPages: (stageId: string, from: number, to: number) => void;
  renameStage: (stageId: string, name: string) => void;
  removeStage: (stageId: string) => void;
  selectPage: (stageId: string, pageId: string) => void;
  /** Insert a new connected stage after/before this one (via the edge "+" affordance). */
  addAfter: (stageId: string) => void;
  addBefore: (stageId: string) => void;
}

export const StageBuilderContext = createContext<StageBuilderApi | null>(null);

export function useStageBuilder(): StageBuilderApi {
  const ctx = useContext(StageBuilderContext);
  if (ctx === null) {
    throw new Error('useStageBuilder must be used within a StageBuilder');
  }
  return ctx;
}
