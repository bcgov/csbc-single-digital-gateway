import { useMemo, useState } from 'react';
import type { FunnelData } from './clause-match';
import {
  formHasError,
  mayOpen,
  pathErrors,
  type FunnelError,
  type PathErrors,
} from './funnel-errors';
import { formsOf, nodeIdOf, showsSummaryPage, type FunnelElement } from './funnel-graph';
import {
  nextStep,
  startFormId,
  visitedAfterPathChange,
  visitedWith,
  type FunnelContext,
} from './funnel-position';
import { listedFormIds, upcomingStepRange, type StepRange } from './funnel-projection';
import type { RailStep } from './funnel-sidebar';
import type { StepTone } from './funnel-step-rows';

// The Funnel's fill state (doc 274 rules 13-22): where the citizen is, where they have been, and what Next, Back,
// Submit and the rail may do. The ANSWERS and errors are JSONForms'; the graph is the document's.

const EMPTY: ReadonlySet<string> = new Set<string>();

/** Everything the renderer draws from. */
export interface FunnelRunner {
  /** The Form on screen, or `null` when the Funnel has no Form to start at (rule 9). */
  readonly current: FunnelElement | null;
  readonly summary: boolean;
  readonly steps: readonly RailStep[];
  readonly upcoming: StepRange | undefined;
  /** Rule 26: `undefined` when the Funnel has no summary page. */
  readonly summaryStep:
    | { readonly current: boolean; readonly locked: boolean; readonly tone: StepTone }
    | undefined;
  /** Rule 30: the projected path's Forms. */
  readonly pathForms: readonly FunnelElement[];
  readonly canGoBack: boolean;
  readonly atEnd: boolean;
  readonly blocked: boolean;
  readonly submitBlocked: boolean;
  open(formId: string): void;
  openSummary(): void;
  next(): void;
  back(): void;
  submit(): void;
}

interface Progress {
  readonly position: string | null;
  readonly visited: ReadonlySet<string>;
  readonly history: readonly string[];
  readonly summary: boolean;
  /** Rule 23: the summary page has been opened, so its row reads as visited once the citizen goes Back. */
  readonly summaryVisited: boolean;
  /** Forms the citizen has had on screen (rule 21). */
  readonly seen: ReadonlySet<string>;
  readonly submitAttempted: boolean;
}

function initialProgress(context: FunnelContext): Progress {
  const position = startFormId(context) ?? null;
  const seeded = position === null ? EMPTY : new Set([position]);
  return {
    position,
    visited: seeded,
    history: [],
    summary: false,
    summaryVisited: false,
    seen: seeded,
    submitAttempted: false,
  };
}

/** Going to a Form leaves the summary page, records history, and marks the Form visited and seen. */
function goTo(progress: Progress, formId: string): Progress {
  return {
    ...progress,
    summary: false,
    position: formId,
    history:
      progress.position === null ? progress.history : [...progress.history, progress.position],
    visited: visitedWith(progress.visited, formId),
    seen: visitedWith(progress.seen, formId),
  };
}

export function useFunnelRunner(
  funnel: FunnelElement,
  schema: Record<string, unknown>,
  data: FunnelData | undefined,
  errors: readonly FunnelError[],
  /** Submit once no path error blocks it — the host's `onSubmit`, or the payload dialog (rule 18). */
  finish: () => void,
  /** Doc 281 rule 21c: errors show but never block navigation. */
  freeNavigation = false,
): FunnelRunner {
  const context = useMemo(() => ({ funnel, schema, data }), [funnel, schema, data]);
  const [progress, setProgress] = useState(() => initialProgress(context));
  const { position } = progress;
  const listed = listedFormIds(context, position ?? undefined, progress.visited);
  usePathReset(listed, progress, setProgress);

  const forms = useMemo(() => formsById(funnel), [funnel]);
  const pathForms = usePathForms(listed, forms);
  const path = pathErrors(funnel, listed, errors);
  const current = position === null ? null : (forms.get(position) ?? null);
  const blocked = !freeNavigation && current !== null && formHasError(current, errors);
  const upcoming = upcomingStepRange(context, progress.visited);
  return {
    current,
    summary: progress.summary,
    steps: railSteps(listed, forms, progress, path, freeNavigation),
    upcoming,
    summaryStep: showsSummaryPage(funnel)
      ? {
          current: progress.summary,
          // Rule 23: last on the rail, so a visited summary is always PAST the current step when not on it.
          tone: progress.summary ? 'current' : progress.summaryVisited ? 'visited' : 'ahead',
          locked:
            !progress.summary &&
            !(upcoming === undefined && (freeNavigation || pathValidated(path, progress))),
        }
      : undefined,
    pathForms,
    canGoBack: progress.summary || progress.history.length > 0,
    atEnd: progress.summary || position === null || nextStep(context, position).kind === 'end',
    blocked,
    // Rule 18: Submit stays pressable while an errored path Form can be shown; unowned errors have nowhere to go.
    submitBlocked: path.submitBlocked && path.firstError === undefined,
    ...runnerActions(context, progress, setProgress, path, blocked, finish),
  };
}

/**
 * Rule 13: when the listed path changes, progress past the change resets. Adjusted DURING render (React's "storing
 * information from previous renders" pattern), so the rail never paints stale progress for a frame; it converges.
 */
function usePathReset(
  listed: readonly string[],
  progress: Progress,
  setProgress: (next: Progress) => void,
) {
  const [lastListed, setLastListed] = useState<readonly string[]>(listed);
  if (lastListed.join('|') === listed.join('|')) return;
  setLastListed(listed);
  const kept = visitedAfterPathChange(
    lastListed,
    listed,
    progress.visited,
    progress.position ?? undefined,
  );
  // The summary follows every Form, so any change to the path is a change before it: it is no longer visited.
  if (kept === progress.visited && !progress.summaryVisited) return;
  setProgress({
    ...progress,
    visited: kept,
    seen: new Set([...progress.seen].filter((id) => kept.has(id))),
    summaryVisited: false,
  });
}

/** Rule 30: the path's Forms, kept by identity while the path is unchanged so the summary does not re-dispatch. */
function usePathForms(
  listed: readonly string[],
  forms: ReadonlyMap<string, FunnelElement>,
): readonly FunnelElement[] {
  const pathKey = listed.join('|');
  return useMemo(
    () =>
      pathKey.split('|').flatMap((id): FunnelElement[] => {
        const form = forms.get(id);
        return form === undefined ? [] : [form];
      }),
    [pathKey, forms],
  );
}

function formsById(funnel: FunnelElement): ReadonlyMap<string, FunnelElement> {
  const forms = new Map<string, FunnelElement>();
  for (const form of formsOf(funnel)) {
    const id = nodeIdOf(form);
    if (id !== undefined && !forms.has(id)) forms.set(id, form);
  }
  return forms;
}

/**
 * Rule 26: the summary opens only once the LAST page has been validated — the citizen has reached it and no Form on
 * the path, the last included, owns an error. (An undecided branch means the path has no last page yet.)
 */
function pathValidated(path: PathErrors, progress: Progress): boolean {
  const last = path.formIds.at(-1);
  if (last === undefined) return false;
  const reached = progress.visited.has(last) || progress.position === last;
  return reached && path.erroredForms.size === 0;
}

/** Rules 21-24: each listed Form as the rail draws it. */
function railSteps(
  listed: readonly string[],
  forms: ReadonlyMap<string, FunnelElement>,
  progress: Progress,
  path: PathErrors,
  freeNavigation: boolean,
): RailStep[] {
  // On the summary page every listed step lies before the current one.
  const at = progress.summary ? listed.length : listed.indexOf(progress.position ?? '');
  return listed.map((id, index) => {
    const current = !progress.summary && progress.position === id;
    const reached = progress.visited.has(id) || progress.position === id;
    const tone: StepTone = current
      ? 'current'
      : !reached
        ? 'ahead'
        : index < at
          ? 'passed'
          : 'visited';
    const label = forms.get(id)?.['label'];
    const flagged =
      path.erroredForms.has(id) &&
      (progress.submitAttempted || (progress.seen.has(id) && id !== progress.position));
    return {
      id,
      label: typeof label === 'string' && label.trim() !== '' ? label : 'Form',
      current,
      tone,
      lock: !reached
        ? 'upcoming'
        : freeNavigation || mayOpen(path, progress.position, id)
          ? null
          : 'blocked',
      hasError: flagged,
    };
  });
}

/** Rules 16-18: what each action does. Every update reads the progress it was rendered with. */
function runnerActions(
  context: FunnelContext,
  progress: Progress,
  setProgress: (next: Progress) => void,
  path: PathErrors,
  blocked: boolean,
  finish: () => void,
) {
  const { position } = progress;
  return {
    open: (formId: string) => setProgress(goTo(progress, formId)),
    openSummary: () => setProgress({ ...progress, summary: true, summaryVisited: true }),
    next: () => {
      if (position === null || blocked || progress.summary) return;
      const step = nextStep(context, position);
      if (step.kind === 'form') setProgress(goTo(progress, step.formId));
      if (step.kind === 'summary')
        setProgress({ ...progress, summary: true, summaryVisited: true });
    },
    back: () => {
      if (progress.summary) return setProgress({ ...progress, summary: false });
      const previous = progress.history.at(-1);
      if (previous !== undefined)
        setProgress({ ...progress, position: previous, history: progress.history.slice(0, -1) });
    },
    submit: () => {
      if (!path.submitBlocked) return finish();
      const target = path.firstError;
      if (target === undefined) return;
      const moved = target === position && !progress.summary ? progress : goTo(progress, target);
      setProgress({ ...moved, submitAttempted: true });
    },
  };
}
