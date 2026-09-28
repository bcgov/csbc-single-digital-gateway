import { RichTextInput } from '@repo/ui/rich-text-input';
import { useEffect, useRef } from 'react';
import type { RichTextState } from '../ui/rich-text-value';
import { useCommitOnLeave, useInlineEdit } from './use-inline-edit';
import type { InlineEditableProps } from '../../types/elements';

/**
 * Doc 223: rich content edited in place on the canvas — a Form's Description, a Rich Text block.
 *
 * THE CANVAS AND THE INSPECTOR SHOW ONE VALUE, LIVE (bug 14). A Rich Text block's editor is open for
 * as long as the block is selected (rule 9), which is exactly when the inspector's Content field — the
 * same value — is on screen beside it. Committing only on blur left each showing stale text while the
 * other was typed in. So this editor now:
 *
 *  1. WRITES as the author types, through the same `InspectorField.write` the inspector's own field
 *     uses (which already wrote per keystroke), so the inspector follows.
 *  2. Is handed the DOCUMENT's value, not a captured seed, so it follows the inspector.
 *
 * The loop `apply-inspector.ts` records (a per-keystroke writer against an editor that re-seeds on
 * every value change, fighting its own caret) is shut inside `RichTextInput`'s value sync instead: a
 * FOCUSED editor is never re-seeded, a value it already holds is ignored, and a synced value is never
 * reported back as a change. The commit on blur / on leave remains as the backstop; with the value
 * already written it changes nothing.
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
  inputClassName,
  picksField,
  children,
}: InlineEditableProps) {
  const current = typeof value === 'string' ? undefined : value;
  const { editable, active, claim, release, commitValue } = useInlineEdit<
    RichTextState | undefined
  >(element, fieldKey, current, picksField);

  /**
   * The editor's latest content, in a REF rather than state.
   *
   * `RichTextInput` reports every change, and storing those in state re-renders the editor on its own
   * output — which in the browser froze the renderer outright. Nothing here renders from the draft:
   * it is only needed at the moment of commit, so a ref is both correct and the fix.
   */
  const draft = useRef<RichTextState | undefined>(current);

  /**
   * The value the editor held when it went live — what `useCommitOnLeave` compares the draft with,
   * so leaving an untouched editor writes nothing. Captured on the render that turns it live.
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

  /**
   * Focus when the editor goes live — doc 223 bug 1, in the editor that never had the fix.
   *
   * Before rule 7 the editor was already mounted by the time the author pressed it, so the press
   * landed in Lexical by itself. Now the press is what OPENS it, and the same failure bug 1 records
   * for the single-line input applies here: the input does not exist when the press begins, and the
   * browser finishes the mousedown by moving focus to the nearest focusable ancestor of what was
   * clicked — `<body>`. Measured: one click opened the editor with no caret and a second was needed.
   *
   * The two halves are the input's, for the same two reasons: `onPointerUp` below covers a press
   * (which ends ON the editor, already mounted by then), and this deferred focus covers a selection
   * that came from somewhere else — a `RichContent` block reached from the breadcrumbs or just
   * inserted, which under rule 9 goes live with no press at all.
   */
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return undefined;
    const frame = requestAnimationFrame(() => focusContent(editorRef.current));
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!editable) return children;
  /**
   * Doc 207 rule 37: an EMPTY block shows its placeholder on the canvas, so the author can see the
   * block is there and click into it. Before this it rendered literally nothing — an authored-but-
   * unfilled Rich content block was invisible and reachable only by its frame.
   *
   * STUDIO ONLY, and that is why it lives here rather than in the renderer: outside the studio this
   * component is not mounted at all (the context default renders `children`), so a citizen's form
   * still renders nothing for empty content. A frozen field returns above, before this line.
   *
   * DOC 223 BUG 4 IS THE HAZARD HERE, and it was re-verified by hand. A studio grid item measures its
   * content to size itself (doc 180 rule 17b), and wrapping the old NOTHING in an affordance span was
   * once enough to put the measure/resize/re-render cycle into a loop that froze the renderer at load.
   * What froze it was a wrapper with no content — a zero-height box the measurer could never settle
   * on. Real text gives the item a stable height on the first pass, which is the difference.
   */
  if (!active && children === null)
    return (
      <span
        data-slot="inline-rich-text-placeholder"
        data-inline-editable=""
        onPointerDown={claim}
        /*
         * `inputClassName` is the caller's read-view typography, and the placeholder needs it for the
         * SAME reason the editor does (doc 223 rule 10b): without an explicit size this span takes the
         * canvas's 16px, so the block's empty text stood a size larger than both the editor that opens
         * on it and the content that eventually replaces it. Measured 16px against the editor's 14px —
         * the very bug rule 10b was written for, reintroduced by a new bare wrapper.
         */
        /*
         * Doc 223 rule 11's treatment, so the canvas has ONE resting look for "nothing written here":
         * dimmed and muted at rest, full strength when the pointer is on it. The Form's title and
         * description placeholders are dimmed by their areas, and `text-muted-foreground` alone left
         * this one reading nearly black beside them (`rgb(71,69,67)` at full opacity).
         */
        className={`block cursor-text text-muted-foreground opacity-50 hover:text-foreground hover:opacity-100 ${inputClassName ?? ''}`}
      >
        {placeholder}
      </span>
    );
  if (!active)
    return (
      <span
        data-slot="inline-rich-text"
        data-inline-editable=""
        // Rule 7: the same press that selects the element picks this field — see `inline-text.tsx`
        // for why it is `pointerdown` and not a click.
        onPointerDown={claim}
        // Rule 12: the cursor is the affordance — see `inline-text.tsx`.
        className="block cursor-text rounded-xs"
      >
        {children}
      </span>
    );

  return (
    <div
      ref={editorRef}
      data-studio-inline=""
      data-slot="inline-rich-text-input"
      // Locked studio content sets `pointer-events-none` so presses fall through to the grid item;
      // the editor opts back in, exactly as a Stage card's row controls do (doc 196 rule 13).
      // `inputClassName` carries the read view's own spacing and colour, so swapping one for the
      // other moves nothing — the single-line editor does the same with its `text-h1 font-bold`.
      className={`pointer-events-auto ${inputClassName ?? ''}`}
      // React's onBlur IS focusout, so it fires when focus leaves the editor entirely — which is the
      // commit point. Enter cannot be it here: inside rich text Enter is a new paragraph.
      // Rule 8: and leaving the field stops editing it. `release` is conditional, so a press that
      // has already claimed another field is not undone by this blur arriving after it.
      onBlur={() => {
        commitValue(draft.current);
        release();
      }}
      // The press that opened this editor ends here — see the focus note above.
      onPointerUp={(event) => focusContent(event.currentTarget)}
    >
      {/* Rules 8-10: drawn where the value is READ — no border, no background, no inset, and one
          line tall until its content needs more. `rows={1}` writes an inline `minHeight` in `lh`,
          which is what beats the component's own `min-h-28` floor. */}
      <RichTextInput
        // Bug 14: the document's value, so an inspector edit shows here. `RichTextInput` ignores it
        // while this editor has focus, which is what keeps the author's caret safe as they type.
        value={current ?? null}
        onChange={(next) => {
          draft.current = next;
          // Bug 14: written as typed, so the inspector's field shows it without waiting for a blur.
          commitValue(next);
        }}
        toolbar={[]}
        bare
        rows={1}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

/**
 * Focuses the Lexical surface inside the wrapper, caret at the END.
 *
 * Found by hand: `focus()` alone lands the caret at the START of a `contenteditable`, so the first
 * thing typed was inserted BEFORE the existing description rather than after it. The end matches the
 * single-line editor's rule and its reasoning — the editor is entered by clicking the value, not by
 * a deliberate rewrite gesture, so what the author types must not disturb what is already there.
 *
 * The range is set BEFORE focusing: Lexical reconciles its own selection from the DOM one when the
 * surface takes focus, so ordering it the other way leaves Lexical holding the caret it defaulted to.
 *
 * The surface is found by its `data-slot` rather than a ref of its own — `RichTextInput` owns that
 * element and exposes no ref, and the slot is already a documented hook the Form Studio inspector
 * styles through (doc 207).
 */
function focusContent(wrapper: HTMLElement | null): void {
  const content = wrapper?.querySelector<HTMLElement>('[data-slot="rich-text-content"]');
  if (!content) return;
  /**
   * Doc 223 rule 13: ONLY the press that opens the editor places the caret. Once the surface has focus
   * the browser's own selection wins, untouched.
   *
   * Without this guard the caret-to-end below ran on EVERY pointerup inside the editor — including the
   * second one of a double click, which lands after the browser has selected a word. The word was
   * selected and then thrown away in the same gesture, so double click (and drag select) did nothing.
   * FOUND BY THE AUTHOR; no jsdom test would see it, since jsdom neither selects words nor orders these
   * events the way a browser does.
   */
  if (content === document.activeElement || content.contains(document.activeElement)) return;
  const selection = globalThis.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(content);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  content.focus();
}
