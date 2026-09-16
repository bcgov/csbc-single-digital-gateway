import { Button } from '@repo/ui/button';

// The runner's action bar (doc 202 rules 34-39). Presentational: it takes what may be done and the handlers, and
// owns no state — the runner decides what is gated and what each action means.

export interface RunnerActionsProps {
  /** Back is offered only once there is somewhere to go back to; it never validates (rule 26). */
  readonly canGoBack: boolean;
  /** The last step shows Submit instead of Next (rule 16). */
  readonly atEnd: boolean;
  /** The current Form owns an error, so Next is refused (rule 24). */
  readonly blocked: boolean;
  /** Any error in the document, so Submit is refused (rule 27). */
  readonly submitBlocked: boolean;
  /** An awaited handler is in flight (rules 35-36). */
  readonly busy: boolean;
  /** Absent when the host passed no `onSaveDraft` — the button renders DISABLED rather than vanishing (rule 37). */
  readonly canSaveDraft: boolean;
  onBack(): void;
  onNext(): void;
  onSaveDraft(): void;
  onSubmit(): void;
}

/**
 * A real flex footer, not a sticky overlay: the pane above owns the scrolling, so the bar sits at the bottom of the
 * column — the shape `categorization-flow-layout`'s bar already uses.
 *
 * Submit always renders (rule 38 gives it a meaning even with no handler), and Save draft always renders too,
 * disabled when there is nothing to save through, so an author previewing still sees where it sits.
 */
export function RunnerActions({
  canGoBack,
  atEnd,
  blocked,
  submitBlocked,
  busy,
  canSaveDraft,
  onBack,
  onNext,
  onSaveDraft,
  onSubmit,
}: RunnerActionsProps) {
  return (
    <div
      data-slot="runner-actions"
      className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-6 py-3"
    >
      <Button type="button" variant="outline" disabled={!canGoBack} onClick={onBack}>
        Back
      </Button>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          data-slot="runner-save-draft"
          // Rule 37: disabled, not hidden — the affordance is part of the layout an author is previewing.
          disabled={!canSaveDraft || busy}
          onClick={onSaveDraft}
        >
          Save draft
        </Button>
        {atEnd ? (
          <Button
            type="button"
            data-slot="runner-submit"
            disabled={submitBlocked || busy}
            onClick={onSubmit}
          >
            Submit
          </Button>
        ) : (
          <Button type="button" data-slot="runner-next" disabled={blocked} onClick={onNext}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
