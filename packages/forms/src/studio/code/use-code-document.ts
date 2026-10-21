import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { documentText, parseDocumentText, sameJson, type DocumentProblem } from './document-text';
import type { DocumentCheck } from './validate-document';

/** Rule 16: how long typing must pause before a pane's text is applied. */
export const APPLY_DELAY_MS = 300;

/** `pending` while typing, then `applied` or `invalid` once the text has been checked. */
export type CodeStatus = 'applied' | 'pending' | 'invalid';

export interface CodeDocumentOptions<T> {
  /** The pane's half of the studio document. */
  readonly value: T;
  readonly validate: (value: unknown) => DocumentCheck<T>;
  readonly apply: (value: T) => void;
}

export interface CodeDocument {
  /** The text the editor shows. */
  readonly text: string;
  readonly status: CodeStatus;
  readonly problems: readonly DocumentProblem[];
  /** The author edited the text. */
  readonly onChange: (text: string) => void;
}

interface PaneState {
  readonly text: string;
  readonly status: CodeStatus;
  readonly problems: readonly DocumentProblem[];
}

const NO_PROBLEMS: readonly DocumentProblem[] = Object.freeze([]);
const appliedText = (text: string): PaneState => ({
  text,
  status: 'applied',
  problems: NO_PROBLEMS,
});

/**
 * Text ⇄ document sync for one code pane (doc 191 rules 15-20). Edits apply after a pause when they parse and pass
 * `validate`; invalid text stays unapplied. Whenever the half changes from outside the pane its text is replaced —
 * pending or invalid text included, with the pending apply cancelled (rule 19, user decision). The pane's own
 * write-back is recognised by identity (`replaceDocument` stores the applied object), so it keeps the author's text.
 */
export function useCodeDocument<T>({
  value,
  validate,
  apply,
}: CodeDocumentOptions<T>): CodeDocument {
  const [state, setState] = useState(() => appliedText(documentText(value)));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seen = useRef(value);
  const applied = useRef<T | undefined>(undefined);
  const latest = useRef({ value, validate, apply });

  // A layout effect runs before a pending apply's timer can fire, so an apply never reads a stale half.
  useLayoutEffect(() => {
    latest.current = { value, validate, apply };
    if (value === seen.current) return;
    seen.current = value;
    if (value === applied.current) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    setState(appliedText(documentText(value)));
  }, [value, validate, apply]);

  useEffect(() => {
    const pending = timer;
    return () => clearTimeout(pending.current);
  }, []);

  const commit = useCallback((text: string) => {
    timer.current = undefined;
    const parsed = parseDocumentText(text);
    if (!parsed.ok) {
      setState({ text, status: 'invalid', problems: [parsed.problem] });
      return;
    }
    const current = latest.current;
    const result = current.validate(parsed.value);
    if (!result.valid) {
      setState({ text, status: 'invalid', problems: result.problems });
      return;
    }
    setState({ text, status: 'applied', problems: NO_PROBLEMS });
    if (sameJson(result.value, current.value)) return;
    applied.current = result.value;
    current.apply(result.value);
  }, []);

  const onChange = useCallback(
    (text: string) => {
      clearTimeout(timer.current);
      setState({ text, status: 'pending', problems: NO_PROBLEMS });
      timer.current = setTimeout(() => commit(text), APPLY_DELAY_MS);
    },
    [commit],
  );

  return { ...state, onChange };
}
