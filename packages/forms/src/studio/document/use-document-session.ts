import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormChoice, FormStudioProps, StudioDocument } from '../../types/index';
import type { CapabilityMap } from '../../capabilities/capability-types';
import { documentFor } from './document-source';

/** The four statuses the studio shell renders (doc 200 rule 2). */
export type DocumentSessionStatus = 'choosing' | 'loading' | 'ready' | 'failed';

/** What the session hook is told: the same three document props `FormStudio` takes. */
export type DocumentSessionInput = Pick<
  FormStudioProps,
  'schema' | 'uischema' | 'capabilities' | 'loadDocument'
>;

/**
 * The document the session hands to `useStudioDocument` (doc 200 principle 1). Both halves are optional because a host
 * may seed one alone — `useStudioDocument` fills the other from the sample — while a loaded or chosen document always
 * carries both.
 */
export type SessionDocument = {
  schema?: JsonSchema | undefined;
  uischema?: UISchemaElement | undefined;
  /** Doc 220: present (even as `{}`) only for a TEMPLATE, whose permissions are authorable. */
  capabilities?: CapabilityMap | undefined;
};

export type DocumentSession = {
  status: DocumentSessionStatus;
  /** The document to edit while `status` is `'ready'`; `null` otherwise. */
  document: SessionDocument | null;
  /** Why the load failed while `status` is `'failed'`; `null` otherwise. Text only — never markup (doc 200 rule 5). */
  reason: string | null;
  /** Commits a choice from the New form dialog. Wins over any load still in flight (doc 200 rule 6). */
  choose: (choice: FormChoice) => void;
  /** Runs `loadDocument` again after a failure (doc 200 rule 5). */
  retry: () => void;
};

/** A settled load, or a choice the author made. `pending` covers both "not started" and "in flight". */
type Outcome =
  | { kind: 'pending' }
  | { kind: 'loaded'; document: StudioDocument }
  | { kind: 'chosen'; document: StudioDocument }
  | { kind: 'failed'; reason: string };

const PENDING: Outcome = { kind: 'pending' };

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The seeded halves as one stable object, or `null` when the host seeded neither. */
function useSeededDocument({
  schema,
  uischema,
  capabilities,
}: DocumentSessionInput): SessionDocument | null {
  return useMemo(() => {
    if (schema === undefined && uischema === undefined) return null;
    // `exactOptionalPropertyTypes`: an absent half must be an absent KEY, not an explicit `undefined`.
    const document: SessionDocument = {};
    if (schema !== undefined) document.schema = schema;
    if (uischema !== undefined) document.uischema = uischema;
    if (capabilities !== undefined) document.capabilities = capabilities;
    return document;
  }, [schema, uischema, capabilities]);
}

/**
 * Which document the Form Studio opens, and what it reports while getting there (doc 200 rules 2, 4-6).
 *
 * Precedence is exactly rule 2's: a seeded `schema`/`uischema` is `ready` at once — that is what keeps every existing
 * host and test working — else a `loadDocument` is `loading` until it settles, else the author chooses.
 *
 * Rule 4: `loadDocument` runs in an EFFECT, once per function identity (a changed identity re-loads), never during
 * render — a render-phase fetch would fire twice under StrictMode and on every unrelated re-render. A resolved document
 * is handed through UNVALIDATED: `StudioCanvas`'s root check is the one place that reports a bad root, so this hook
 * must never grow a second one.
 *
 * Rule 6: choosing is an explicit act and outranks an in-flight fetch, so both a `chosen` ref and a per-run `live` flag
 * gate the resolution handlers. The ref (not the state) is read there because the handlers close over the render that
 * started the load, where the state is still `pending`; `live` also covers unmount, so a late resolve never sets state.
 */
export function useDocumentSession(input: DocumentSessionInput): DocumentSession {
  const seededDocument = useSeededDocument(input);
  const { loadDocument } = input;
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome>(PENDING);
  const chosen = useRef(false);

  useEffect(() => {
    if (seededDocument !== null || loadDocument === undefined || chosen.current) return;
    let live = true;
    setOutcome((previous) => (previous.kind === 'pending' ? previous : PENDING));
    void loadDocument().then(
      (document) => {
        if (live && !chosen.current) setOutcome({ kind: 'loaded', document });
      },
      (error: unknown) => {
        if (live && !chosen.current) setOutcome({ kind: 'failed', reason: reasonOf(error) });
      },
    );
    return () => {
      live = false;
    };
  }, [seededDocument, loadDocument, attempt]);

  const choose = useCallback((choice: FormChoice) => {
    chosen.current = true;
    setOutcome({ kind: 'chosen', document: documentFor(choice) });
  }, []);

  const retry = useCallback(() => {
    setOutcome(PENDING);
    setAttempt((previous) => previous + 1);
  }, []);

  const session = useMemo<Omit<DocumentSession, 'choose' | 'retry'>>(() => {
    if (seededDocument !== null) return { status: 'ready', document: seededDocument, reason: null };
    if (outcome.kind === 'loaded' || outcome.kind === 'chosen')
      return { status: 'ready', document: outcome.document, reason: null };
    if (outcome.kind === 'failed')
      return { status: 'failed', document: null, reason: outcome.reason };
    return {
      status: loadDocument === undefined ? 'choosing' : 'loading',
      document: null,
      reason: null,
    };
  }, [seededDocument, outcome, loadDocument]);

  return { ...session, choose, retry };
}
