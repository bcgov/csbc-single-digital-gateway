import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import { StudioFillContext } from '../../renderers/studio/studio-fill';
import type { DocumentContent } from '../document-types';
import { withAnswers } from './answer-edits';

/** One stable empty object, so JSONForms is never handed new data for "no answers". */
const NO_ANSWERS: Record<string, unknown> = {};

/** Doc 281: the document's answers and how the canvas writes them; `null` = the studio is not fillable. */
export interface StudioAnswers {
  data: Record<string, unknown>;
  write: (data: Record<string, unknown>) => void;
}

const StudioAnswersContext = createContext<StudioAnswers | null>(null);

export function useStudioAnswers(): StudioAnswers | null {
  return useContext(StudioAnswersContext);
}

/**
 * Provides a fillable studio's answers to the canvas (doc 281 rules 4-7) — beside the canvas graph, never in its node
 * data, so typing never rebuilds the graph or remounts a grid. A write goes through `setContent`, the path every edit
 * takes, against the LATEST content (a ref), and writes nothing when the answers are unchanged.
 */
export function StudioAnswersProvider({
  fillable,
  content,
  setContent,
  children,
}: {
  fillable: boolean;
  content: DocumentContent | null;
  setContent: (content: DocumentContent) => void;
  children: ReactNode;
}) {
  const latest = useRef(content);
  latest.current = content;
  const write = useCallback(
    (data: Record<string, unknown>) => {
      const current = latest.current;
      if (current === null) return;
      const next = withAnswers(current, definedOnly(data));
      if (next !== current) setContent(next);
    },
    [setContent],
  );
  // Keyed on the stored answers alone: `content` itself changes with every edit.
  const open = content !== null;
  const stored = content?.data;
  const answers = useMemo(
    () => (fillable && open ? { data: stored ?? NO_ANSWERS, write } : null),
    [fillable, open, stored, write],
  );
  return (
    <StudioAnswersContext value={answers}>
      <StudioFillContext value={answers !== null}>{children}</StudioFillContext>
    </StudioAnswersContext>
  );
}

/** Top-level answers JSONForms cleared (`undefined`) dropped, so an emptied field is absent, not a stored key. */
function definedOnly(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

/** What a canvas page's `<JsonForms>` is given (doc 281 rules 4-9). */
export interface CanvasAnswers {
  data: Record<string, unknown>;
  /** Absent: not fillable, or the page is not open for editing. */
  onChange: ((state: { data: unknown }) => void) | undefined;
  /** Fillable but not editable (the page is animating, or the studio is read-only): controls draw disabled. */
  readonly: boolean;
}

/** One stable empty object for a page that draws no answers. */
const NO_DATA: Record<string, unknown> = {};

/**
 * A canvas page's answers: the stored ones when fillable, else none. JSONForms emits its data on mount, and an emit
 * equal to the stored answers is that echo, not an edit — `write` returns without a change for it (rule 5).
 */
export function useCanvasAnswers(editable: boolean): CanvasAnswers {
  const answers = useStudioAnswers();
  const write = answers?.write;
  const onChange = useMemo(
    () =>
      write === undefined || !editable
        ? undefined
        : ({ data }: { data: unknown }) => {
            if (typeof data === 'object' && data !== null && !Array.isArray(data))
              write(data as Record<string, unknown>);
          },
    [write, editable],
  );
  return { data: answers?.data ?? NO_DATA, onChange, readonly: answers !== null && !editable };
}
