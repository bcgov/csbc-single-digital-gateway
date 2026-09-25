import { useEffect, useRef } from 'react';
import type { InlineEditableProps } from '../../types/elements';
import { useInlineEdit } from './use-inline-edit';

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
  children,
}: InlineEditableProps) {
  const { editable, active, draft, setDraft, commit, revert } = useInlineEdit(
    element,
    fieldKey,
    value,
  );
  const inputRef = useRef<HTMLInputElement>(null);

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
        // Doc 223: the affordance says "this text is editable" without drawing another box — the
        // element already has a dashed frame around it, and a second one reads as two states.
        data-inline-editable=""
        className="rounded-xs decoration-muted-foreground/50 underline-offset-4 hover:underline"
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
      onBlur={commit}
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
      className={`pointer-events-auto w-full rounded-xs bg-transparent outline-none focus:ring-1 focus:ring-ring ${inputClassName ?? ''}`}
    />
  );
}
