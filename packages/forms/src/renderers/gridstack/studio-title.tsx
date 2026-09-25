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
import { formDescriptionOf, TITLE_SPACING, type FormTitleProps } from './form-renderer';
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
    return (
      // Rule 7b: `opacity-50`, the same treatment the studio's disabled fields get (`@repo/ui` Field/Label), so the
      // title and description read as part of the non-interactive canvas rather than as a greyed colour. `select-none`
      // for the same reason: a disabled field's Label can't be text-selected either (user request 2026-09-17).
      <div
        data-slot="form-title-block"
        className={`${TITLE_SPACING} opacity-50 select-none`}
        style={studioInset(uischema)}
      >
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
        >
          {title === '' ? (
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
        {/* Rule 22: an unwritten description shows its own placeholder, exactly as the title does (rule 11), so the
          author can see where it goes. Fillable forms still render nothing (rule 20b).
          Doc 223: and it edits in place, writing the same `formDescription` inspector field the panel does. */}
        <Editable
          element={uischema}
          fieldKey="formDescription"
          value={description ?? EMPTY_RICH_TEXT}
          placeholder={FORM_DESCRIPTION_PLACEHOLDER}
        >
          {description === undefined ? (
            <p data-slot="form-description-placeholder" className="mt-2 text-muted-foreground">
              {FORM_DESCRIPTION_PLACEHOLDER}
            </p>
          ) : (
            <div data-slot="form-description" className="mt-2 text-muted-foreground">
              <RichTextView value={description} />
            </div>
          )}
        </Editable>
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
