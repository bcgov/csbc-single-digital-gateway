import { useCallback, useEffect, useRef, useState } from 'react';
import type { ElementIds } from './layout/element-ids';
import type { StudioDocument } from './layout/schema-properties';
import type { SavedEntry } from './options/option-draft';
import { optionsTargetOf, type OptionsTarget } from './options/options-target';

// Doc 206 rules 5-9 — which field's options are being edited. Mounted in `form-studio.tsx` beside the delete
// confirmation, which is the same shape of thing: a dialog the studio owns, driven by an id and nothing else.
//
// It deliberately does NOT hold the draft. That lives in the dialog and dies with it, which is what makes
// Cancel / Escape / the overlay discard everything (rule 9) without any state to reset.

interface OptionsDocument extends StudioDocument {
  readonly ids: ElementIds;
  updateOptions(
    elementId: string,
    entries: readonly SavedEntry[],
    renames: ReadonlyMap<string | number, string | number>,
  ): void;
}

export interface OptionsEditor {
  /** The field being edited, or `undefined` when the dialog is closed. */
  readonly target: OptionsTarget | undefined;
  /** Rule 5: opens the editor, IGNORING an element that has no options (rule 6). */
  open(elementId: string): void;
  close(): void;
  save(
    entries: readonly SavedEntry[],
    renames: ReadonlyMap<string | number, string | number>,
  ): void;
}

export function useOptionsEditor(studio: OptionsDocument): OptionsEditor {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Reads the latest document, like the Grid editor's insert, so `open` keeps its identity across edits.
  const latest = useRef(studio);
  useEffect(() => {
    latest.current = studio;
  });

  const open = useCallback((elementId: string) => {
    const doc = latest.current;
    // Rule 6: a double-click on a field with no options does nothing at all — not even a flash of a dialog.
    if (optionsTargetOf(doc, elementId, doc.ids) !== undefined) setEditingId(elementId);
  }, []);

  const close = useCallback(() => setEditingId(null), []);

  const save = useCallback(
    (entries: readonly SavedEntry[], renames: ReadonlyMap<string | number, string | number>) => {
      const id = editingId;
      if (id !== null) latest.current.updateOptions(id, entries, renames);
      setEditingId(null);
    },
    [editingId],
  );

  // Resolved every render, so a field deleted or rewritten under the open dialog closes it rather than
  // editing a list that no longer exists.
  const target = editingId === null ? undefined : optionsTargetOf(studio, editingId, studio.ids);
  return { target, open, close, save };
}
