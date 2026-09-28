import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Doc 223 rule 7 — WHICH field of the selected element is being edited in place.
 *
 * An element may own more than one inline value: a root `Form` owns its Title and its Description,
 * and `StudioTitle` draws both. Before this axis existed, `active` keyed on the ELEMENT, so
 * selecting the Form to rename it opened the description's editor too (bug 6).
 *
 * This is NOT the `selectedPart` the doc's superseded paragraph refused. Nothing here reaches the
 * selection: no gate in `use-studio-selection.ts` knows a field exists, and an element is selected,
 * hovered, dragged, copied and deleted exactly as before. The axis is owned by the layer that
 * already knew about fields.
 */
export interface InlineEditFocus {
  /** Whether this element's field is the one being edited. */
  isEditing(elementId: string, fieldKey: string): boolean;
  /** Claims the focus for a field — the press that reaches its read view. */
  claim(elementId: string, fieldKey: string): void;
  /**
   * Gives it up, but ONLY if this field still holds it.
   *
   * The condition is load-bearing. Moving from the Title straight into the Description fires the
   * Description's `pointerdown` BEFORE the Title's `blur`, so an unconditional release would wipe a
   * claim that had just been made and the author's second click would do nothing.
   */
  release(elementId: string, fieldKey: string): void;
}

/** No provider: no field is ever claimed, which is the read-only passthrough outside the studio. */
const NO_FOCUS: InlineEditFocus = {
  isEditing: () => false,
  claim: () => {},
  release: () => {},
};

const InlineEditFocusContext = createContext<InlineEditFocus>(NO_FOCUS);

export const InlineEditFocusProvider = InlineEditFocusContext.Provider;

/** The inline edit focus in scope, or a passthrough that claims nothing. */
export function useInlineEditFocus(): InlineEditFocus {
  return useContext(InlineEditFocusContext);
}

/**
 * Builds the focus the studio canvas provides.
 *
 * Plain state, and the context value CHANGES IDENTITY when the claim moves. A stable identity over a
 * ref would be cheaper and wrong: every inline surface reads this during render, and one behind a
 * memo boundary would never learn that another field had taken the focus.
 *
 * Both writers compare inside a functional update, so they stay identity-stable while still reading
 * the latest claim — which is what lets `release` be conditional (see the interface).
 */
export function useInlineEditFocusState(): InlineEditFocus {
  const [focused, setFocused] = useState<{ elementId: string; fieldKey: string } | null>(null);

  const claim = useCallback((elementId: string, fieldKey: string) => {
    setFocused((current) =>
      current?.elementId === elementId && current.fieldKey === fieldKey
        ? current
        : { elementId, fieldKey },
    );
  }, []);

  const release = useCallback((elementId: string, fieldKey: string) => {
    setFocused((current) =>
      current?.elementId === elementId && current.fieldKey === fieldKey ? null : current,
    );
  }, []);

  return useMemo(
    () => ({
      isEditing: (elementId: string, fieldKey: string) =>
        focused?.elementId === elementId && focused.fieldKey === fieldKey,
      claim,
      release,
    }),
    [focused, claim, release],
  );
}
