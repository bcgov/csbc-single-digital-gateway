import { useState } from 'react';

interface PreviewFocusOptions {
  readonly previewing: boolean;
  readonly setPreviewing: (next: boolean) => void;
  /** The Form the canvas currently shows (doc 196 rule 12), or `null`. */
  readonly focusId: string | null;
  readonly select: (elementId: string) => void;
  /** Whether `elementId` is still in the document. */
  readonly contains: (elementId: string) => boolean;
}

/**
 * Doc 196 rule 16: preview clears the selection, and with it the drilled-in Form, so entering preview remembers the
 * focused Form. Preview renders that Form alone; leaving preview selects it again — drilling back in — when it is still
 * in the document, and forgets it. Setting the mode it is already in does nothing.
 */
export function usePreviewFocus({
  previewing,
  setPreviewing,
  focusId,
  select,
  contains,
}: PreviewFocusOptions) {
  const [remembered, setRemembered] = useState<string | null>(null);

  const setPreviewingWithFocus = (next: boolean) => {
    if (next === previewing) return;
    if (next) {
      setRemembered(focusId);
    } else {
      if (remembered !== null && contains(remembered)) select(remembered);
      setRemembered(null);
    }
    setPreviewing(next);
  };

  /**
   * Doc 184 rule 20: preview ONE Form of a multi-stage document, straight from the header. It is the same remembered
   * focus the drilled-in case uses (rule 16), set explicitly instead of read from the canvas — so leaving preview
   * drills into that Form, exactly as leaving a preview entered from it does.
   */
  const previewForm = (elementId: string) => {
    if (previewing) return;
    setRemembered(elementId);
    setPreviewing(true);
  };

  return {
    previewing,
    previewFocusId: previewing ? remembered : null,
    setPreviewing: setPreviewingWithFocus,
    previewForm,
  };
}
