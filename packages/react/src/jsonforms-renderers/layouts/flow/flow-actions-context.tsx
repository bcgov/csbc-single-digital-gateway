import { createContext, useContext, type ReactNode } from 'react';

/**
 * The Categorization "flow" layout's save actions — the host half of the mechanism (feature 176).
 *
 * A JSONForms layout renderer receives only `uischema / schema / path / enabled / visible`. It has
 * no route context, no BFF, and no host callbacks — so the flow layout's Save & next / Save & exit
 * affordances cannot be props. They arrive the same way the address control's geo data
 * (`GeoDataProvider`) and the section Edit button (`EditActionProvider`) do: through a React context
 * port the consuming app mounts around the form.
 *
 * **No provider → no save affordances.** {@link useFlowActions} returns `null` and the layout falls
 * back to a plain Back / Next / Done bar — still fully navigable, never throwing. That keeps the
 * renderer safe in unit tests, in the form-builder preview, and anywhere else a flow-variant
 * Categorization happens to be dispatched without a host that can persist.
 */
export interface FlowActions {
  /**
   * Persist the current data.
   *
   * Resolve to continue (advance a step, or exit on the last one); **reject to keep the user where
   * they are**. The layout awaits this before navigating, so a failed save can never silently skip
   * a step — the host surfaces the error and the user retries from the same place.
   */
  onSave: (data: Record<string, unknown>) => Promise<void> | void;
  /** Leave the flow entirely. Called by Save & exit, only after `onSave` resolves. */
  onExit: () => void;
  /** Host-owned in-flight flag — disables both save affordances while true. */
  saving?: boolean;
}

const FlowActionsContext = createContext<FlowActions | null>(null);

export function FlowActionProvider({
  value,
  children,
}: {
  value: FlowActions;
  children: ReactNode;
}) {
  return <FlowActionsContext.Provider value={value}>{children}</FlowActionsContext.Provider>;
}

/** The injected flow actions, or `null` when no provider is mounted. */
export function useFlowActions(): FlowActions | null {
  return useContext(FlowActionsContext);
}
