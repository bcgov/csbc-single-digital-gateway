import { createContext, useContext } from 'react';

/**
 * Doc 199 rule 20: the outputs of the Condition being drawn that are already WIRED, by handle id (a criterion's
 * id, or `DEFAULT_HANDLE` for the default path).
 *
 * The card needs this to show a + beside each UNCONNECTED output, and it cannot work it out for itself: whether
 * an output is wired is a question about the FLOW's edges, and a card is dispatched through JSONForms with its own
 * element alone. `ConditionNode` derives it from the node data `toFlowNodes` builds and provides it here — the
 * same one-way "derive on the canvas, hand down to the card" path `FlowContext` already follows.
 *
 * `null` means no Condition node is above: the card is being rendered outside a canvas, so it shows no +.
 */
const ConditionOutputsContext = createContext<ReadonlySet<string> | null>(null);

export const ConditionOutputsProvider = ConditionOutputsContext.Provider;

/** The wired outputs of the Condition being drawn, or `null` outside a Condition node. */
export function useConditionOutputs(): ReadonlySet<string> | null {
  return useContext(ConditionOutputsContext);
}
