import { createContext, useContext, type ReactNode } from 'react';

/**
 * The Categorization "flow" layout's step control — the host half of step navigation (feature 177).
 *
 * A layout renderer receives only `uischema / schema / path / enabled / visible`, so it cannot read
 * or write a URL. When a host wants the current step to be **addressable** — linkable, bookmarkable,
 * reachable with browser Back — it mounts this port and the layout stops owning the step: it renders
 * whichever step the port names and reports every requested change back out.
 *
 * This is the same injected-provider-port shape as `GeoDataProvider` (data), `EditActionProvider`
 * (an affordance) and `FlowActionProvider` (saving). Keeping it a port is what lets `@repo/react`
 * stay router-agnostic: nothing here knows a URL exists.
 *
 * **No provider → the layout keeps its own local step state**, exactly as it did before this
 * feature. {@link useFlowStep} returns `null` and the form-builder preview, the citizen application
 * path and every isolated test carry on with no navigation involved.
 */
export interface FlowStepControl {
  /**
   * The step the host wants shown.
   *
   * `null` — or an id that matches no step, which is what a stale link looks like — resolves to the
   * first step rather than an error state (`resolveStepIndex`).
   */
  stepId: string | null;
  /**
   * A step change the layout is requesting. The layout does NOT move itself while this port is
   * mounted; it re-renders when the host sends back a new {@link stepId}, so the address and the
   * content can never disagree.
   */
  onStepChange: (stepId: string) => void;
  /**
   * Layout → host: does the CURRENT step own a validation error?
   *
   * The flag is computed here (from `useJsonForms().core.errors`) but is needed outside — the
   * unsaved-changes dialog's Save action is gated on it, and that dialog is rendered by the host.
   * Fired only when the value actually changes, so an inline provider value cannot loop.
   */
  onBlockedChange?: (blocked: boolean) => void;
}

const FlowStepContext = createContext<FlowStepControl | null>(null);

export function FlowStepProvider({
  value,
  children,
}: {
  value: FlowStepControl;
  children: ReactNode;
}) {
  return <FlowStepContext.Provider value={value}>{children}</FlowStepContext.Provider>;
}

/** The injected step control, or `null` when no provider is mounted. */
export function useFlowStep(): FlowStepControl | null {
  return useContext(FlowStepContext);
}
