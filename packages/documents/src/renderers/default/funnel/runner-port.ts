import { createContext, useContext, useState } from 'react';

// The port `DocumentRunner` hands down to the renderers it mounts (doc 274 rules 35-38). The Funnel renderer is
// dispatched INSIDE the runner's `<JsonForms>`, so it cannot take props: the host's handlers reach it here. No
// provider = no host — Submit shows the payload, Save draft stays disabled — which is the bare `<JsonForms>` case.

/** An answers handler a host passes; a rejection leaves the citizen where they are. */
export type AnswersHandler = (answers: Record<string, unknown>) => void | Promise<void>;

export interface DocumentRunnerPort {
  readonly onSubmit?: AnswersHandler;
  readonly onSaveDraft?: AnswersHandler;
  /** Doc 276: nobody may fill this document — Save draft and Submit are refused; navigation stays free. */
  readonly disabled?: boolean;
  /** Doc 276: `false` draws no action bar at all (a read-only page). */
  readonly actions?: boolean;
  /** Doc 281 rule 21a: `false` hides the final Submit — the host submits elsewhere; Back / Next / Save draft stay. */
  readonly submit?: boolean;
}

const DocumentRunnerContext = createContext<DocumentRunnerPort | null>(null);

export const DocumentRunnerProvider = DocumentRunnerContext.Provider;

/** The runner around this renderer, or `null` when it is rendered by a bare `<JsonForms>`. */
export function useDocumentRunner(): DocumentRunnerPort | null {
  return useContext(DocumentRunnerContext);
}

/** What the action bar's Save draft and final Submit do, given the host (if any). */
export interface HostActions {
  readonly busy: boolean;
  readonly canSaveDraft: boolean;
  /** Doc 276: Save draft and Submit are refused whatever the answers. */
  readonly disabled: boolean;
  /** Doc 276: whether to draw the action bar. */
  readonly actions: boolean;
  /** Doc 281 rule 21a: whether the bar offers Submit at the end. */
  readonly submit: boolean;
  /** The payload dialog — Submit's fallback when the host has no `onSubmit` (rule 18). */
  readonly previewing: boolean;
  setPreviewing(open: boolean): void;
  saveDraft(): void;
  /** Submit once nothing blocks it: the host's `onSubmit`, else the payload dialog. */
  finish(): void;
}

/** Rule 37: host handlers are awaited, busy-stated, and never run twice at once. */
export function useHostActions(port: DocumentRunnerPort | null, data: unknown): HostActions {
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const run = (handler: AnswersHandler | undefined) => {
    if (handler === undefined || busy) return;
    setBusy(true);
    const answers = (typeof data === 'object' && data !== null ? data : {}) as Record<
      string,
      unknown
    >;
    void Promise.resolve()
      .then(() => handler(answers))
      .catch((error: unknown) => {
        // The host raised it and owns its presentation; logged so it is never lost.
        console.error('[DocumentRunner] a host handler rejected', error);
      })
      .finally(() => setBusy(false));
  };
  return {
    busy,
    canSaveDraft: port?.disabled !== true && port?.onSaveDraft !== undefined,
    disabled: port?.disabled === true,
    actions: port?.actions !== false,
    submit: port?.submit !== false,
    previewing,
    setPreviewing,
    saveDraft: () => run(port?.onSaveDraft),
    finish: () => (port?.onSubmit === undefined ? setPreviewing(true) : run(port.onSubmit)),
  };
}
