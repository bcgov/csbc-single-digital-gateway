import { RichTextInput } from '@repo/ui/rich-text-input';
import { useRef } from 'react';
import type { RichTextState } from '../ui/rich-text-value';
import { useCommitOnLeave, useInlineEdit } from './use-inline-edit';
import type { InlineEditableProps } from '../../types/elements';

/**
 * Doc 223: rich content edited in place on the canvas — a Form's Description, a Rich Text block.
 *
 * THE LEXICAL LOOP IS SHUT BY CONSTRUCTION, not by comparison. `apply-inspector.ts` records the bug
 * this feature had to survive: an editor that writes on every keystroke, against `RichTextView`'s
 * `SyncPlugin` re-seeding whenever `value` changes, re-renders the canvas on every pass and fights
 * its own caret.
 *
 * Two things prevent it, and BOTH are needed:
 *
 *  1. The draft is local and only commits on blur, so the document changes once per edit.
 *  2. The editor is seeded ONCE, from a value captured when it goes live. `RichTextInput` owns its
 *     content after mount, so handing it a `value` that changes as the author types would re-seed it
 *     mid-keystroke — the same shape as (1) but inside Lexical, where it eats the caret instead of a
 *     render.
 *
 * `toolbar={[]}` is deliberate: a floating toolbar over the canvas would cover the element being
 * edited, and the inspector's own Description field — the same value, the same write path — already
 * offers the full one. Inline editing is for typing, not formatting.
 */
export function InlineRichText({
  element,
  fieldKey,
  value,
  placeholder,
  children,
}: InlineEditableProps) {
  const current = typeof value === 'string' ? undefined : value;
  const { editable, active, commitValue } = useInlineEdit<RichTextState | undefined>(
    element,
    fieldKey,
    current,
  );

  /**
   * The editor's latest content, in a REF rather than state.
   *
   * `RichTextInput` reports every change, and storing those in state re-renders the editor on its own
   * output — which in the browser froze the renderer outright. Nothing here renders from the draft:
   * it is only needed at the moment of commit, so a ref is both correct and the fix.
   */
  const draft = useRef<RichTextState | undefined>(current);

  /**
   * The value the editor was seeded with. Captured on the render that turns it live and never
   * updated while it stays live — see (2) above. Keyed by that same capture so a NEW edit (select
   * away, come back) starts from whatever the document holds now.
   */
  const seed = useRef<RichTextState | undefined>(current);
  const wasActive = useRef(false);
  if (active && !wasActive.current) {
    seed.current = current;
    draft.current = current;
  }
  wasActive.current = active;

  // Leaving the editor commits, whether by blur, by deselection or by unmount.
  useCommitOnLeave(
    active,
    () => draft.current,
    () => seed.current,
    commitValue,
  );

  if (!editable) return children;
  /**
   * Nothing to show and not being edited: render NOTHING, exactly as before.
   *
   * A studio grid item measures its content to size itself (doc 180 rule 17b), and an empty
   * `RichContent` used to render literally nothing. Wrapping that nothing in an affordance span was
   * enough to put the measure/resize/re-render cycle into a loop that FROZE the renderer outright —
   * at load, before anything was even selected. The read view at rest has to stay byte-identical
   * inside a grid item, not merely equivalent.
   */
  if (!active && children === null) return null;
  if (!active)
    return (
      <span
        data-slot="inline-rich-text"
        data-inline-editable=""
        className="block rounded-xs decoration-muted-foreground/50 underline-offset-4 hover:underline"
      >
        {children}
      </span>
    );

  return (
    <div
      data-studio-inline=""
      data-slot="inline-rich-text-input"
      // Locked studio content sets `pointer-events-none` so presses fall through to the grid item;
      // the editor opts back in, exactly as a Stage card's row controls do (doc 196 rule 13).
      className="pointer-events-auto"
      // React's onBlur IS focusout, so it fires when focus leaves the editor entirely — which is the
      // commit point. Enter cannot be it here: inside rich text Enter is a new paragraph.
      onBlur={() => commitValue(draft.current)}
    >
      <RichTextInput
        value={seed.current ?? null}
        onChange={(next) => (draft.current = next)}
        toolbar={[]}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}
