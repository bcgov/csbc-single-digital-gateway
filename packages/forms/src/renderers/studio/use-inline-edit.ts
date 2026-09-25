import type { UISchemaElement } from '@jsonforms/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { mayEdit } from '../../capabilities/capability-for';
import { useGridEditor } from '../gridstack/grid-editor';
import { useCapability } from './studio-capabilities';
import { useSelectionPort } from './studio-selection';

/**
 * Doc 223 — editing a value in place on the canvas.
 *
 * ONE mechanism behind every inline surface (Title, Description, a Section's heading, a Heading's
 * text, a Rich Text block). The surfaces differ only in which `InspectorField` key they write and
 * what their read view looks like.
 *
 * The selection model is deliberately unchanged: hovering shows the value is editable, clicking
 * selects the OWNING element exactly as today, and the value becomes editable because that element
 * is selected. There is no `selectedPart` — a second selection axis would touch every gate in
 * `use-studio-selection.ts` for precision this does not need.
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
  /** Whether the editor is LIVE: editable, and the owning element is the selected one. */
  readonly active: boolean;
  /** The value to render while editing — the local draft, never the document. */
  readonly draft: T;
  /** Replaces the draft. Does not write. */
  readonly setDraft: (value: T) => void;
  /** Writes the draft through the inspector field, if it changed. */
  readonly commit: () => void;
  /** Throws the draft away and restores the document's value. */
  readonly revert: () => void;
}

export function useInlineEdit<T>(
  element: UISchemaElement | undefined,
  fieldKey: string,
  value: T,
): InlineEdit<T> {
  const selection = useSelectionPort();
  const editor = useGridEditor();
  const capability = useCapability(element ?? EMPTY_ELEMENT);

  const id = selection && editor && element ? editor.idOf(element) : undefined;
  const editable =
    id !== undefined && selection?.editField !== undefined && mayEdit(capability, fieldKey);
  const active = editable && selection?.selectedId === id;

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

  const commit = useCallback(() => {
    if (id === undefined || selection?.editField === undefined) return;
    selection.editField(id, fieldKey, draft);
  }, [id, selection, fieldKey, draft]);

  const revert = useCallback(() => setDraft(committed.current), []);

  return { editable, active, draft, setDraft, commit, revert };
}

/** A stand-in so the capability hook runs unconditionally even before the element resolves. */
const EMPTY_ELEMENT = { type: 'Element' } as UISchemaElement;
