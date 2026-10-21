import type { JsonSchema } from '@jsonforms/core';
import { SECTION_TYPE } from '../../renderers/gridstack/grid-layouts';
import {
  DEFAULT_SECTION_INSET,
  DEFAULT_SECTION_VARIANT,
  INSET_REM,
  SECTION_INSETS,
  SECTION_VARIANTS,
  sectionInset,
  sectionVariant,
} from '../../renderers/gridstack/section-options';
import { richTextIsEmpty, richTextValue } from '../../renderers/ui/rich-text-value';
import type { InspectorContext } from './inspector-context';
import { optionsOf, setElement, withOption } from './inspector-edits';
import type { InspectorField } from './inspector-fields';

// The Section's own settings (doc 212 rules 20-22), in their own module: `inspector-fields.ts` is at the 300-line
// gate, which is why `content-fields.ts`, `document-fields.ts` and `mask-number-fields.ts` already exist.
//
// Label and Gap are NOT here. Both apply to anything with a layout kind, and a Section has one (`KIND_BY_TYPE`),
// so they arrive with no new field — which is the whole point of registering Section as a second type of an
// existing kind rather than as a kind of its own.

const isSection = (ctx: InspectorContext) => ctx.element.type === SECTION_TYPE;

/** Rule 13: the two ways a Section draws itself. */
const VARIANT_SCHEMA: JsonSchema = Object.freeze({
  type: 'string',
  oneOf: [
    { const: 'plain', title: 'Plain' },
    { const: 'container', title: 'Container' },
  ] satisfies { const: (typeof SECTION_VARIANTS)[number]; title: string }[],
});

/** Rule 15: the inset names, titled with their size — the shape `GAP_SCHEMA` uses, for the same reason. */
const INSET_SCHEMA: JsonSchema = Object.freeze({
  type: 'string',
  oneOf: SECTION_INSETS.map((inset) => ({
    const: inset,
    title: `${inset.toUpperCase()} · ${INSET_REM[inset]}rem`,
  })),
});

/** Doc 212 rule 20: the same placeholder wording a Form's description field uses. */
export const SECTION_DESCRIPTION_PLACEHOLDER = 'Describe this section';

export const SECTION_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'variant',
    section: 'layout',
    label: 'Variant',
    applies: isSection,
    schema: () => VARIANT_SCHEMA,
    // The EFFECTIVE variant, so the field shows what the Section is rather than what it was authored with.
    read: (ctx) => sectionVariant(optionsOf(ctx.element)),
    // The default removes the option, exactly as the Gap field does — an option set to its default is the same
    // as no option, and the document stays minimal.
    write: (_ctx, edit, value) =>
      setElement(
        edit,
        withOption(edit.element, 'variant', value === DEFAULT_SECTION_VARIANT ? undefined : value),
      ),
  },
  {
    // Rule 21: ABSENT while the variant is plain, rather than present and inert. A plain Section has no box to
    // pad, so an Inset control there would be a setting that does nothing — which is worse than no setting.
    key: 'inset',
    section: 'layout',
    label: 'Inset',
    applies: (ctx) => isSection(ctx) && sectionVariant(optionsOf(ctx.element)) === 'container',
    schema: () => INSET_SCHEMA,
    read: (ctx) => sectionInset(optionsOf(ctx.element)),
    write: (_ctx, edit, value) =>
      setElement(
        edit,
        withOption(edit.element, 'inset', value === DEFAULT_SECTION_INSET ? undefined : value),
      ),
  },
  {
    /**
     * Rule 3: rich content, and the field SCHEMA is what dispatches the rich text control — the inspector
     * reuses the ui control set by reference, so no inspector-only renderer is involved (doc 207 rule 31).
     *
     * `sectionDescription`, not `description`: that key is a bound property's Description field, and one key
     * names one inspector value (doc 207's reason for `formDescription`).
     */
    key: 'sectionDescription',
    section: 'general',
    label: 'Description',
    applies: isSection,
    schema: () => ({
      type: 'object',
      required: ['root'],
      description: 'Shown under the section heading.',
    }),
    options: () => ({ placeholder: SECTION_DESCRIPTION_PLACEHOLDER }),
    read: (ctx) => richTextValue(optionsOf(ctx.element)['description']),
    write: (_ctx, edit, value) =>
      setElement(
        edit,
        withOption(
          edit.element,
          'description',
          richTextIsEmpty(richTextValue(value)) ? undefined : value,
        ),
      ),
  },
] satisfies InspectorField[]);
