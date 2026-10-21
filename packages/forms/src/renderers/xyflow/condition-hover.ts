import { createContext, useContext } from 'react';

// Which Condition row the pointer is over (doc 199 rule 50). CANVAS state, never document state: a hover that
// wrote to the uischema would dirty the document and push an undo entry for moving the mouse.
//
// It follows the same one-way path as `FlowContext` and `ConditionOutputsContext` — the renderer owns the value
// and hands it down — so the card and the edges agree on what is highlighted without either knowing the other.

/** The hovered output's handle id — a row id, or `DEFAULT_HANDLE` for the Else row — and how to set it. */
export interface ConditionHover {
  /** `null` when nothing is hovered. */
  readonly handle: string | null;
  /** The node the hovered row belongs to, so two Conditions cannot highlight at once. */
  readonly nodeId: string | null;
  setHovered(nodeId: string | null, handle: string | null): void;
}

const NONE: ConditionHover = { handle: null, nodeId: null, setHovered: () => undefined };

// Kept in a module with no components so the components reading it stay Fast Refresh-able.
const ConditionHoverContext = createContext<ConditionHover>(NONE);

export const ConditionHoverProvider = ConditionHoverContext.Provider;

/** The canvas's hover state. Outside a canvas this is inert, so a card rendered alone simply never highlights. */
export function useConditionHover(): ConditionHover {
  return useContext(ConditionHoverContext);
}

/** Whether `handle` of `nodeId` is the hovered output — the one test the card and the edges both apply. */
export const isHovered = (hover: ConditionHover, nodeId: string, handle: string): boolean =>
  hover.nodeId === nodeId && hover.handle === handle;
