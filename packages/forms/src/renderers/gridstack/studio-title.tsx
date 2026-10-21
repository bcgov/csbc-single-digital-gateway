import type { UISchemaElement } from '@jsonforms/core';
import { Heading } from '@repo/ui/heading';
import { RichTextView } from '@repo/ui/rich-text-view';
import type { CSSProperties } from 'react';
import { useInlineEditable } from '../ui/inline-editable';
import { labelOf } from './element-label';
import {
  FORM_DESCRIPTION_PLACEHOLDER,
  FORM_TITLE_PLACEHOLDER,
  SERVICE_TITLE_PLACEHOLDER,
} from './element-placeholders';
import {
  formDescriptionOf,
  showsDescription,
  showsTitle,
  TITLE_SPACING,
  type FormTitleProps,
} from './form-renderer';
import { EMPTY_RICH_TEXT } from '../ui/rich-text-value';
import { GAP_REM, layoutGapOf } from './layout-gap';

/**
 * The STUDIO canvas title block, split out of `form-renderer.tsx` by doc 223.
 *
 * The split is structural: `form-renderer.tsx` is imported by `renderers/default`, and only the
 * STUDIO title needs the inline-editing seam below. `createGridRenderers` is the sole consumer of
 * these components and `renderers/default` never imports that (doc 193 rule 3, pinned by a test), so
 * the fillable path carries none of this.
 *
 * `form-renderer.tsx` keeps everything genuinely shared: `createFormRenderer`, `FillFormTitle`,
 * `formDescriptionOf`, the nested-boundary messages.
 */

/**
 * Doc 201 rule 7b: the studio title and description are inset exactly as far as an element's content, so the text
 * lines up with the fields below. A studio grid item's content sits `gap / 2` (its gridstack margin) + 1px (the
 * frame's border) + 0.5rem (the frame's `p-2`) inside the grid's edge — measured in the browser, 17px at the default
 * `md` gap. The gap is authored per Form, so this is an inline style, not a class.
 */
/**
 * Doc 223 rule 11: one inline area's resting treatment, and what lifts it.
 *
 * `opacity-50` is doc 201 rule 7b's treatment — the same one the studio's disabled fields get — moved
 * from the title BLOCK down to each area, because an ancestor's opacity cannot be undone by a
 * descendant: while it sat on the block, nothing inside could ever draw at full strength.
 *
 * Splitting it per area is also what makes the states per area: hovering the title must not brighten
 * the description, exactly as pressing the title must not open the description's editor (rule 7).
 */
const AREA = 'opacity-50';
/**
 * Engaged: the pointer is on THIS area, or THIS area's editor holds focus. Both are the author's
 * attention, and both are pure CSS — no state, and nothing that could brighten the other area.
 *
 * The element's SELECTION deliberately does not count (user, 2026-09-28). A Form owns both values,
 * so lifting them together meant selecting the title blackened the description and vice versa —
 * the same complaint rule 7 fixed for the editors, reappearing in the styling.
 */
const AREA_ENGAGED = 'hover:opacity-100 focus-within:opacity-100';
/**
 * …and for an area that RESTS muted, engaging it also brings the text to full colour.
 *
 * The title needs no counterpart: it inherits the canvas's own colour and was only ever dimmed.
 */
const AREA_ENGAGED_TEXT = 'hover:text-foreground focus-within:text-foreground';

function studioInset(uischema: UISchemaElement): CSSProperties {
  const half = GAP_REM[layoutGapOf(uischema.options)] / 2;
  return { paddingInline: `calc(${half}rem + 1px + 0.5rem)` };
}

/**
 * Doc 215 rule 6: the studio canvas title of a root boundary, built for one element type by its empty-title
 * placeholder — 'Untitled form' for a Form, 'Untitled service' for a Service. Everything else about the block is the
 * same for both, so there is one implementation.
 *
 * Doc 201 rule 7: the studio canvas title — the heading alone, no rule and no chrome. Rule 7b: styled like the
 * studio's disabled fields, and inset to line up with the elements. Rule 11: an empty title draws a muted placeholder
 * instead, so an untitled Form still shows the author where its title goes. Rule 20: the description sits under it
 * with the same inset and grey; rule 22: unwritten, it shows a placeholder of its own.
 */
export function createStudioTitle(placeholder: string) {
  function StudioTitle({ uischema }: FormTitleProps) {
    // Doc 223: the studio supplies this at the canvas root; everywhere else it is the read-only
    // passthrough, so the block renders exactly as it always has.
    const Editable = useInlineEditable();
    const title = labelOf(uischema, '');
    const description = formDescriptionOf(uischema);
    /**
     * Doc 201 rules 23-24: a hidden title or description is not drawn on the canvas either — the canvas is
     * a preview of the form, so it shows what a citizen will see. The value stays in the document and stays
     * editable in the inspector, which is also where the toggle lives, so nothing becomes unreachable.
     *
     * The PLACEHOLDER goes with it: an unwritten-but-hidden title has no "where it goes" to point at.
     */
    const withTitle = showsTitle(uischema);
    const withDescription = showsDescription(uischema);
    return (
      // Rule 7b: `select-none`, because a disabled field's Label can't be text-selected either (user request
      // 2026-09-17). The dimming that used to sit here moved DOWN to the two areas (rule 11) — an ancestor's
      // `opacity` cannot be undone by a descendant, so a block-level one made "black when engaged" unreachable.
      <div
        data-slot="form-title-block"
        className={`${TITLE_SPACING} select-none`}
        style={studioInset(uischema)}
      >
        {/* Rule 11: ENGAGED means hovered, being edited, or belonging to the selected element — and the
            area draws at full strength for all three. Two of them need no state at all: `hover:` is the
            pointer, and `focus-within:` is the editor, which lives inside this wrapper. The third is the
            flag the read view stamps, read with `has-[…]` so this block still needs no selection port.
            The wrapper is the CALLER's, not the editor's: a field a governing template froze renders with
            no wrapper of its own (the integration contract), and would otherwise lose its dimming. */}
        {withTitle ? (
          <div className={`${AREA} ${AREA_ENGAGED}`}>
            {/* Doc 223: editable in place under the selection port; `InlineText` renders its child
            unchanged everywhere else, which is every fillable form. The input carries `text-h1` so
            the title does not jump when it becomes editable. BOTH are needed and were both measured:
            `text-h1` alone left the text at the right size but weight 400 against the heading's 700,
            because `@repo/ui` base styles put those ON the element and an input inherits neither. */}
            <Editable
              element={uischema}
              fieldKey="label"
              value={title}
              placeholder={placeholder}
              inputClassName="text-h1 font-bold"
              // Rule 7: a Form owns BOTH this and its Description, so the press picks which one opens.
              picksField
            >
              {title === '' ? (
                // The placeholder stays MUTED when engaged: it is not a title, and drawing it black would
                // read as one. Only its dimming lifts, so an engaged empty title still reads as empty.
                <Heading
                  level={1}
                  size={1}
                  data-slot="form-title-placeholder"
                  className="text-muted-foreground"
                >
                  {placeholder}
                </Heading>
              ) : (
                <Heading level={1} size={1} data-slot="form-title">
                  {title}
                </Heading>
              )}
            </Editable>
          </div>
        ) : null}
        {/* Rule 22: an unwritten description shows its own placeholder, exactly as the title does (doc 201 rule 11),
          so the
          author can see where it goes. Fillable forms still render nothing (rule 20b).
          Doc 223: and it edits in place, writing the same `formDescription` inspector field the panel does. */}
        {/* Rule 11: the description's COLOUR is on this wrapper, not on the read view inside it — a
            description rests muted and goes black when engaged, and an explicit colour on the inner
            element would outrank the wrapper's variant. So the elements below carry size and spacing
            only, and `mt-2` moves up here with the colour it sits beside. */}
        {withDescription ? (
          <div
            className={`mt-2 text-muted-foreground ${AREA} ${AREA_ENGAGED} ${AREA_ENGAGED_TEXT}`}
          >
            <Editable
              element={uischema}
              fieldKey="formDescription"
              value={description ?? EMPTY_RICH_TEXT}
              placeholder={FORM_DESCRIPTION_PLACEHOLDER}
              // Rule 10: the editor carries the read view's own SIZE, so the description neither moves
              // nor changes size when it becomes editable. `text-sm leading-relaxed` is exactly what
              // `RichTextView` renders it with, here and in the citizen's form. Colour is the
              // wrapper's (rule 11), so the text the author types is black like any other input.
              inputClassName="text-sm leading-relaxed"
              picksField
            >
              {description === undefined ? (
                /* Rule 10b: `text-sm leading-relaxed` — what `RichTextView` renders a real description
                 with. Without an explicit size this bare `p` took `@repo/ui`'s base 16px (the trap
                 that CLAUDE.md records for `p`, `li` and `dd`), so the placeholder stood a size LARGER
                 than the description that replaces it: the text shrank both when the editor opened and
                 again when the first character was typed. */
                <p data-slot="form-description-placeholder" className="text-sm leading-relaxed">
                  {FORM_DESCRIPTION_PLACEHOLDER}
                </p>
              ) : (
                <div data-slot="form-description">
                  <RichTextView value={description} />
                </div>
              )}
            </Editable>
          </div>
        ) : null}
      </div>
    );
  }
  StudioTitle.displayName = 'StudioTitle';
  return StudioTitle;
}

/** Doc 192, doc 201: the studio title of a Form. */
export const StudioFormTitle = createStudioTitle(FORM_TITLE_PLACEHOLDER);

/** Doc 215 rule 8: the studio title block of a Service — a Form's, with its own placeholder. */
export const StudioServiceTitle = createStudioTitle(SERVICE_TITLE_PLACEHOLDER);
