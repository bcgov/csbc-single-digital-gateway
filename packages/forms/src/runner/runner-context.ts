import { createContext, useContext } from 'react';
import type { RunnerData } from './criterion-match';
import type { RunnerPosition } from './runner-position';

// The port the runner hands down to the Flow renderer entry (doc 202 rules 40, 5).
//
// `renderers/default`'s Flow entry is dispatched INSIDE the runner's single `<JsonForms>`, so it cannot be given
// props: JSONForms decides what a renderer receives. The runner therefore publishes what the entry needs here —
// the same "no provider = view-only" shape the Grid and Flow editors already use (doc 196 rule 1).
//
// With NO provider the entry still renders a navigable flow holding its own position (rule 40). That is exactly the
// studio's preview: `StudioCanvas` renders `previewRoot` through `renderers/default` and supplies nothing, so a
// Flow becomes fillable there with no change to the studio at all.

/** What the Flow entry may ask of the runner around it. */
export interface RunnerPort {
  /** Where the runner is, or `null` before a position resolves. */
  readonly position: RunnerPosition | null;
  /** Ask to move — the runner validates, gates and records the visit (rules 24-26). */
  goTo(position: RunnerPosition): void;
  /** The Stages reached so far, so the sidebar can refuse a skip ahead (rule 25). */
  readonly visited: ReadonlySet<string>;
  /** The answers, for evaluating Conditions while navigating (rules 19-23). */
  readonly data: RunnerData | undefined;
  /** Whether the Form on screen owns an error, so Next can be blocked (rule 24). */
  readonly blocked: boolean;
  /** Whether this is the last step, so the bar shows Submit rather than Next (rule 16). */
  readonly atEnd: boolean;
}

// In a module with no components, like grid-editor.ts and flow-editor.ts, so components reading it stay
// Fast Refresh-able.
const RunnerContext = createContext<RunnerPort | null>(null);

export const RunnerProvider = RunnerContext.Provider;

/** The runner around this Flow, or `null` when it is rendered outside one (rule 40). */
export function useRunner(): RunnerPort | null {
  return useContext(RunnerContext);
}
