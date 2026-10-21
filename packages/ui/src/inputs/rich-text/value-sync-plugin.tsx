import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createParagraphNode, $getRoot, $setSelection, type SerializedEditorState } from 'lexical';
import { type RefObject, useEffect, useRef } from 'react';

/** Keeps a synced value out of the undo history — an author cannot undo what someone else wrote. */
const SYNC_TAG = 'history-merge';

/**
 * Doc 223 bug 14: keeps an editor showing a `value` changed ELSEWHERE.
 *
 * `RichTextInput` seeds Lexical once, at mount, and owns its content from then on — so before this, an
 * editor bound to a value that something else also edits (the inline canvas editor and the inspector's
 * field both edit a Rich content block) kept showing what it was seeded with until it remounted.
 *
 * Three guards, each against a real failure:
 *
 *  1. Only a CHANGED prop is acted on (`last`), so a re-render with the same value never touches the
 *     editor, and the mount-time seed is not applied twice.
 *  2. A FOCUSED editor is never overwritten. Whatever changed the value, the author is typing HERE — and
 *     re-seeding a focused editor is the controlled-Lexical loop doc 207 rule 25 records: the caret
 *     jumps and keystrokes are lost. Its own changes echo back as a new `value`, which is skipped here.
 *  3. A value equal to what the editor already holds is skipped, so an unfocused editor's own echo
 *     (and a sibling's copy of it) costs nothing.
 */
export function ValueSyncPlugin({
  value,
  syncing,
}: {
  value: SerializedEditorState | null | undefined;
  /**
   * Raised for exactly the duration of a sync. `RichTextInput`'s change listener records the update it
   * sees then as its new baseline and does NOT report it: a value taken FROM the parent is never
   * reported back TO it, which is what stops two editors bound to one value (doc 223's inline canvas
   * editor and the inspector's field) writing to each other for ever.
   *
   * A flag rather than the update's tag, found by measuring: when Lexical still has an update pending
   * (the mount seed, typically), `setEditorState` commits THAT one with the tag and the synced state
   * goes out untagged.
   */
  syncing: RefObject<boolean>;
}) {
  const [editor] = useLexicalComposerContext();
  const serialized = value?.root ? JSON.stringify(value) : null;
  const last = useRef(serialized);

  useEffect(() => {
    if (serialized === last.current) return;
    last.current = serialized;

    const surface = editor.getRootElement();
    if (surface && surface.contains(document.activeElement)) return;
    if (serialized !== null && JSON.stringify(editor.getEditorState().toJSON()) === serialized)
      return;

    syncing.current = true;
    try {
      if (serialized === null) {
        editor.update(
          () => {
            const root = $getRoot();
            root.clear();
            root.append($createParagraphNode());
            // Lexical keeps an editor's last selection after blur; left in place it lands on the new paragraph and
            // reconciling it moves the caret — and focus — into this editor (doc 280, found by hand).
            $setSelection(null);
          },
          // `discrete` commits now, inside the flag, instead of on a later microtask outside it.
          { tag: SYNC_TAG, discrete: true },
        );
      } else {
        editor.setEditorState(editor.parseEditorState(serialized), { tag: SYNC_TAG });
      }
    } finally {
      syncing.current = false;
    }
  }, [editor, serialized, syncing]);

  return null;
}
