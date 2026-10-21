import { useEffect, useRef } from 'react';
import type { InlineEditableProps } from '../../types/elements';
import { useCommitOnLeave, useInlineEdit } from './use-inline-edit';

/**
 * Doc 223: a single-line value edited in place on the canvas — a Title, a Section heading, a
 * Heading's text.
 *
 * Renders `children` unchanged wherever inline editing does not apply, which is every fillable form
 * and every element a governing template froze. That is what lets the SAME renderer serve the studio
 * canvas and a citizen's form.
 *
 * Enter commits and Escape reverts, both on a single line where neither means anything else. Blur
 * commits too, so clicking away keeps the edit rather than silently discarding it.
 *
 * `data-studio-inline` is load-bearing, not decoration: `insidePanelForm` reads it so Escape typed
 * here reverts the edit instead of ALSO walking the selection up to the parent.
 */
export function InlineText({
  element,
  fieldKey,
  value,
  placeholder,
  inputClassName,
  picksField,
  children,
}: InlineEditableProps) {
  // `InlineValue` routes only string values here; the cast states that rather than widening every
  // read below.
  const { editable, active, claim, release, draft, setDraft, commit, commitValue, revert } =
    useInlineEdit(element, fieldKey, typeof value === 'string' ? value : '', picksField);
  const inputRef = useRef<HTMLInputElement>(null);

  // The same commit-on-leave the rich editor needs: clicking away on the canvas deselects, which
  // unmounts this input before `onBlur` can fire.
  const text = typeof value === 'string' ? value : '';
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  const seeded = useRef(text);
  if (!active) seeded.current = text;
  useCommitOnLeave(
    active,
    () => latestDraft.current,
    () => seeded.current,
    commitValue,
  );

  /**
   * Focus when the editor goes live.
   *
   * NOT `autoFocus`, and not a bare `focus()` either — both were measured failing here.
   *
   * The press that selects the element happens BEFORE this input exists. React mounts it during that
   * same press, so `autoFocus` has nothing to attach to; and a `focus()` straight from the effect is
   * UNDONE a moment later, when the browser finishes the mousedown it was still processing and moves
   * focus to the nearest focusable ancestor of what was actually clicked — the heading, which is
   * `<body>`. The symptom is precise and easy to misread: the caret lands correctly
   * (`selectionStart` is right) while `document.activeElement` is `BODY`.
   *
   * A deferred focus covers selection that did NOT come from a press — the breadcrumbs, a keyboard
   * step, a newly inserted element. For a press, the input's own `onPointerUp` does it: the press
   * ends ON the input (it has already replaced the heading under the cursor by then), so that is the
   * first moment the gesture is over and a focus can stick.
   *
   * The caret goes to the END rather than selecting everything: an inline title is entered by
   * clicking the element, not by a deliberate rename gesture, so a stray keystroke must not wipe a
   * title the author only meant to look at.
   */
  useEffect(() => {
    if (!active) return undefined;
    const frame = requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  /**
   * Not editable at all — every fillable form, and every element a governing template froze. NO
   * wrapper element: the DOM outside the studio has to stay byte-identical, both because these
   * renderers are shared with the citizen's form and because a wrapper would quietly reparent the
   * heading for anything reading `firstElementChild`.
   */
  if (!editable) return children;

  if (!active)
    return (
      <span
        data-slot="inline-text"
        // Doc 223 rule 12: the affordance is the CURSOR — a text caret over text that can be typed
        // into, which is what every editable surface on the web says and what an author already
        // reads without being taught. It used to underline on hover; that drew a second mark on an
        // element whose frame already says "selectable", and rule 11's brightening says "reachable"
        // more quietly.
        data-inline-editable=""
        // Rule 7: the press that selects the element also picks WHICH of its fields is edited. It
        // has to be `pointerdown` rather than a click: focus only sticks when the press ENDS on the
        // input (bug 1), so the input must already exist by `pointerup`.
        onPointerDown={claim}
        className="cursor-text rounded-xs"
      >
        {children}
      </span>
    );

  return (
    <input
      ref={inputRef}
      data-studio-inline=""
      data-slot="inline-text-input"
      aria-label={placeholder}
      value={draft}
      placeholder={placeholder}
      // gridstack's draggable ignores mousedown on an `input` (doc 189 rule 4), so a press here
      // cannot start a drag and needs no `cancel` of its own.
      // The press that opened this editor ends here — see the focus note above.
      onPointerUp={(event) => event.currentTarget.focus()}
      onChange={(event) => setDraft(event.target.value)}
      // Rule 8: leaving the field stops editing it. `release` is conditional, so a press that has
      // already claimed ANOTHER field is not undone by this blur arriving after it.
      onBlur={() => {
        commit();
        release();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') revert();
      }}
      // `pointer-events-auto`: locked studio content sets `pointer-events-none` so presses fall
      // through to the grid item, and the editor has to opt back in (doc 196 rule 13's idiom).
      // Rule 12: NO focus ring. An inline editor is drawn where its value is read (rule 10), and a ring
      // is a box — the one thing the surrounding frame already provides. It also made the two halves of
      // one title block disagree: the description's bare editor draws no ring, so clicking the title
      // flashed a blue outline and clicking the description did not.
      className={`pointer-events-auto w-full rounded-xs bg-transparent outline-none ${inputClassName ?? ''}`}
    />
  );
}
