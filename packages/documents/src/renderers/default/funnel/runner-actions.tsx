import { Button } from '@repo/ui/button';

// The runner's action bar (doc 274 rules 15, 36) — a port of `@repo/forms`' `RunnerActions`, shared by the Funnel
// renderer and `DocumentRunner`'s Form root. Presentational: it is told what may be done.

export interface RunnerActionsProps {
  /** A Funnel has Back; a Form root has none at all (rule 36). */
  readonly hasBack: boolean;
  readonly canGoBack?: boolean;
  /** The last step shows Submit instead of Next. */
  readonly atEnd: boolean;
  /** The page on screen owns an error, so Next is refused (rule 16). */
  readonly blocked?: boolean;
  /** Submit is refused (rule 18). */
  readonly submitBlocked: boolean;
  /** A host handler is in flight. */
  readonly busy: boolean;
  /** Rendered either way; disabled without a host `onSaveDraft` (rule 37). */
  readonly canSaveDraft: boolean;
  /** Doc 281 rule 21a: `false` draws no Submit at the end (the host submits elsewhere). */
  readonly showSubmit?: boolean;
  onBack?(): void;
  onNext?(): void;
  onSaveDraft(): void;
  onSubmit(): void;
}

/** Back on the left; Save draft and Next / Submit on the right. */
export function RunnerActions({
  hasBack,
  canGoBack = false,
  atEnd,
  blocked = false,
  submitBlocked,
  busy,
  canSaveDraft,
  showSubmit = true,
  onBack,
  onNext,
  onSaveDraft,
  onSubmit,
}: RunnerActionsProps) {
  return (
    // `ml-auto` on the forward group: with no Back, `justify-between` would pull it to the left edge.
    <div
      data-slot="runner-actions"
      className="flex shrink-0 items-center gap-3 border-t border-border bg-background px-6 py-3"
    >
      {hasBack ? (
        <Button type="button" variant="outline" disabled={!canGoBack} onClick={onBack}>
          Back
        </Button>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          data-slot="runner-save-draft"
          disabled={!canSaveDraft || busy}
          onClick={onSaveDraft}
        >
          Save draft
        </Button>
        {atEnd ? (
          showSubmit && (
            <Button
              type="button"
              data-slot="runner-submit"
              disabled={submitBlocked || busy}
              onClick={onSubmit}
            >
              Submit
            </Button>
          )
        ) : (
          <Button type="button" data-slot="runner-next" disabled={blocked} onClick={onNext}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
