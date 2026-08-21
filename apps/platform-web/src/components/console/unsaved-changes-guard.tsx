import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/alert-dialog';
import { Button } from '@repo/ui/button';
import { useBlocker } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

export interface UnsavedChangesGuardProps {
  /**
   * Whether there is anything to lose.
   *
   * A **function** is read at block time rather than captured at render time, which matters
   * whenever the navigation is triggered by the same code that just saved (feature 177): a state
   * update made in the continuation after `await save()` is not guaranteed to have re-rendered
   * before the next line navigates, so a boolean can still read stale `true` and prompt the user to
   * discard the changes they just saved. Pass a `useCallback(…, [])` reading a ref.
   */
  when: boolean | (() => boolean);
  /**
   * When provided, the dialog offers a third action that saves and THEN continues the blocked
   * navigation. Reject to keep the user in the dialog with the error shown.
   */
  onSave?: () => Promise<void>;
  /**
   * Throw the unsaved edits away, called just before the blocked navigation proceeds.
   *
   * Required whenever the guarded navigation can leave this component MOUNTED — a flow step jump
   * is a route change within one editor, so without this the discarded edits stay in the form,
   * the dirty flag stays up, and the very next navigation prompts again.
   */
  onDiscard?: () => void;
  /** Renders Save disabled, with {@link saveDisabledReason} beside it. */
  saveDisabled?: boolean;
  saveDisabledReason?: string;
}

/** Blocks in-app navigation (and warns on tab close/refresh) while `when` is true, confirming before
 * the user discards unsaved changes. The affirmative action discards and proceeds; a host that can
 * persist may also pass `onSave` to offer saving instead. */
export function UnsavedChangesGuard({
  when,
  onSave,
  onDiscard,
  saveDisabled = false,
  saveDisabledReason,
}: UnsavedChangesGuardProps) {
  // Memoized so the blocker only re-registers when `when` changes identity — a function `when` is
  // expected to be stable, so it registers exactly once and never on a keystroke.
  const shouldBlockFn = useCallback(() => (typeof when === 'function' ? when() : when), [when]);
  const blocker = useBlocker({
    shouldBlockFn,
    enableBeforeUnload: shouldBlockFn,
    withResolver: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    blocker.reset?.();
  };

  const discard = () => {
    setError(null);
    onDiscard?.();
    blocker.proceed?.();
  };

  const save = async () => {
    if (onSave === undefined || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave();
      blocker.proceed?.();
    } catch (cause) {
      // The dialog STAYS OPEN on failure: the navigation is still blocked, the edits are still
      // there, and the user can retry, discard, or go back to editing with the reason in view.
      setError(cause instanceof Error ? cause.message : 'Your changes couldn’t be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      {/* No `relative` here: the popup is already `fixed` (a positioned ancestor, so the close
          control anchors to it), and `cn`'s tailwind-merge would treat `relative` as the winning
          member of the same position group — dropping `fixed` and un-centering the whole dialog. */}
      <AlertDialogContent>
        {/* Only in the save variant, where cancelling has left the footer: three buttons overflow
            the dialog's max-width. Base UI's alert dialog disables POINTER dismissal (no backdrop
            click), so this control — and Escape — are how "keep editing" is reached. Labelled for
            what it does, not for the glyph; the no-save variant keeps its footer button instead, so
            the two never coexist and the name is never ambiguous. */}
        {onSave === undefined ? null : (
          <AlertDialogCancel
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2"
            onClick={close}
          >
            <X aria-hidden />
            <span className="sr-only">Keep editing</span>
          </AlertDialogCancel>
        )}
        <AlertDialogHeader className={onSave === undefined ? undefined : 'pr-8'}>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes haven’t been saved and will be lost if you leave this page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error === null ? null : (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {onSave !== undefined && saveDisabled && saveDisabledReason !== undefined ? (
          <p className="text-sm text-muted-foreground">{saveDisabledReason}</p>
        ) : null}
        <AlertDialogFooter>
          {onSave === undefined ? (
            // Without a save to offer, the original pairing stands: an explicit Keep editing beside
            // a solid destructive Discard. Two buttons fit, and the three pages that render this
            // shape are unchanged.
            <>
              <AlertDialogCancel onClick={close}>Keep editing</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={discard}
              >
                Discard changes
              </AlertDialogAction>
            </>
          ) : (
            <>
              {/* Discarding is the quiet option when saving is available — a ghost button that says
                  what it costs in red, rather than a solid destructive block competing with Save. */}
              <AlertDialogAction
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={discard}
              >
                Discard changes
              </AlertDialogAction>
              {/* A plain Button, NOT AlertDialogAction: the affirmative-action parts close the
                  dialog on click, and a failed save has to be able to keep it open. */}
              <Button type="button" disabled={saveDisabled || saving} onClick={() => void save()}>
                Save changes
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
