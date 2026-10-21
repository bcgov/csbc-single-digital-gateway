import type { UISchemaElement } from '@jsonforms/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { mayEdit } from '../../capabilities/capability-for';
import { useGridEditor } from '../gridstack/grid-editor';
import { useInlineEditFocus } from './inline-edit-focus';
import { useCapability } from './studio-capabilities';
import { useSelectionPort } from './studio-selection';

/**
 * Doc 223 — editing a value in place on the canvas.
 *
 * ONE mechanism behind every inline surface (Title, Description, a Section's heading, a Heading's
 * text, a Rich Text block). The surfaces differ only in which `InspectorField` key they write and
 * what their read view looks like.
 *
 * The selection model is deliberately unchanged: hovering shows the value is editable, and clicking
 * selects the OWNING element exactly as today. No gate in `use-studio-selection.ts` knows a field
 * exists.
 *
 * WHICH field of that element is live is a separate, smaller axis (doc 223 rule 7,
 * `inline-edit-focus.ts`). An element may own more than one — a root `Form` owns its Title and its
 * Description — and keying on the element alone opened both at once. A surface that shares its
 * element opts in with `picksField` and is claimed by the press that reaches it; a surface that owns
 * its element's only value (a `RichContent` block) still goes live on selection, so arriving from
 * the breadcrumbs or on a newly inserted block needs no second press.
 *
 * WRITES GO THROUGH THE INSPECTOR'S OWN FIELD. `selection.editField` applies the same
 * `InspectorField.write` the panel uses, so the canvas and the inspector cannot disagree about a
 * value, and `applyInspector`'s "same document object when nothing changed" rule protects this for
 * free.
 *
 * THE DRAFT IS LOCAL AND COMMITS ON BLUR. Doc 207 rule 25 records what happens otherwise: a live
 * editor writing on every keystroke, against a view that re-seeds on every value change, fights
 * itself and re-renders the canvas on every pass. Holding the draft here means exactly one write per
 * edit, at the end.
 */
export interface InlineEdit<T> {
  /**
   * Whether this value may be edited in place at all — there is a selection port, a host that
   * accepts writes, and the governing template permits this field. False in every fillable form,
   * which is what keeps the shared renderers inert outside the studio.
   */
  readonly editable: boolean;
  /**
   * Whether the editor is LIVE: editable, the owning element is the selected one, and — for a
   * surface that shares its element — this field is the one holding the inline focus.
   */
  readonly active: boolean;
  /** Takes the inline focus for this field. The read view calls it from its own `pointerdown`. */
  readonly claim: () => void;
  /** Gives it up, if this field still holds it. Called when the editor loses focus. */
  readonly release: () => void;
  /** The value to render while editing — the local draft, never the document. */
  readonly draft: T;
  /** Replaces the draft. Does not write. */
  readonly setDraft: (value: T) => void;
  /** Writes the draft through the inspector field, if it changed. */
  readonly commit: () => void;
  /**
   * Writes an explicit value, for an editor that holds its own content.
   *
   * A rich text editor owns its state after mount and reports every change; putting those reports in
   * React state would re-render the editor on its own output, which is the loop this whole design is
   * shaped to avoid. Such an editor keeps its latest value in a ref and hands it over here.
   */
  readonly commitValue: (value: T) => void;
  /** Throws the draft away and restores the document's value. */
  readonly revert: () => void;
}

export function useInlineEdit<T>(
  element: UISchemaElement | undefined,
  fieldKey: string,
  value: T,
  picksField = false,
): InlineEdit<T> {
  const selection = useSelectionPort();
  const editor = useGridEditor();
  const capability = useCapability(element ?? EMPTY_ELEMENT);
  const focus = useInlineEditFocus();

  const id = selection && editor && element ? editor.idOf(element) : undefined;
  const editable =
    id !== undefined && selection?.editField !== undefined && mayEdit(capability, fieldKey);
  const selected = editable && selection?.selectedId === id;
  // Rule 9: a surface that does not share its element goes live on selection alone, as before.
  const active = selected && (!picksField || focus.isEditing(id ?? '', fieldKey));

  const [draft, setDraft] = useState<T>(value);

  /**
   * The document's value while the editor is NOT live, so a change from anywhere else — the
   * inspector panel, the code panel, an undo — is what the reader sees. Once live, the draft is the
   * author's and nothing may overwrite it mid-keystroke.
   */
  const committed = useRef(value);
  committed.current = value;
  useEffect(() => {
    if (!active) setDraft(value);
  }, [active, value]);

  const commitValue = useCallback(
    (next: T) => {
      if (id === undefined || selection?.editField === undefined) return;
      selection.editField(id, fieldKey, next);
    },
    [id, selection, fieldKey],
  );

  const commit = useCallback(() => commitValue(draft), [commitValue, draft]);

  const revert = useCallback(() => setDraft(committed.current), []);

  const { claim: claimFocus, release: releaseFocus } = focus;
  const claim = useCallback(() => {
    if (id !== undefined) claimFocus(id, fieldKey);
  }, [claimFocus, id, fieldKey]);
  const release = useCallback(() => {
    if (id !== undefined) releaseFocus(id, fieldKey);
  }, [releaseFocus, id, fieldKey]);

  return {
    editable,
    active,
    claim,
    release,
    draft,
    setDraft,
    commit,
    commitValue,
    revert,
  };
}

/**
 * Doc 223: commits when the editor STOPS being live — by deselection, or by unmounting.
 *
 * Blur alone is not enough, and the gap is the common case rather than an edge one: clicking away on
 * the canvas deselects the element, which unmounts the editor, and React does not deliver `onBlur`
 * for an element that is being removed. The author types, clicks somewhere else, and silently loses
 * the edit. FOUND BY HAND — every jsdom test passed, because they blur an editor that stays mounted.
 *
 * `getDraft` is read at cleanup time, so it must return the LATEST value rather than a captured one.
 * Nothing is written when the draft is still the value the editor was seeded with, so leaving an
 * untouched editor costs nothing.
 */
export function useCommitOnLeave<T>(
  active: boolean,
  getDraft: () => T,
  getSeed: () => T,
  commitValue: (value: T) => void,
) {
  const latest = useRef({ getDraft, getSeed, commitValue });
  latest.current = { getDraft, getSeed, commitValue };

  useEffect(() => {
    if (!active) return undefined;
    return () => {
      const { getDraft: draft, getSeed: seed, commitValue: commit } = latest.current;
      if (!Object.is(draft(), seed())) commit(draft());
    };
  }, [active]);
}

/** A stand-in so the capability hook runs unconditionally even before the element resolves. */
const EMPTY_ELEMENT = { type: 'Element' } as UISchemaElement;
