import { FORM_DESCRIPTION_PLACEHOLDER } from '../../renderers/gridstack/element-placeholders';
import { richTextIsEmpty, richTextValue } from '../../renderers/ui/rich-text-value';
import { isPageRoot } from '../../renderers/gridstack/grid-layouts';
import { FLOW_TYPE } from '../../renderers/xyflow/flow-elements';
import { startStage } from './field-schemas';
import { optionsOf, orCleared, setElement, withOption } from './inspector-edits';
import type { InspectorField } from './inspector-fields';

// The General-section settings that belong to a document's own roots — a Flow's start stage (doc 203) and a Form's
// description (doc 201 rule 20) — split out of inspector-fields.ts, which is at the file-size gate. Placed right after
// Label, in rendered order.

export const DOCUMENT_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'startId',
    section: 'general',
    label: 'Start stage',
    // Only once there is a Stage to pick: an empty `oneOf` is an invalid schema, and Ajv refuses the whole
    // inspector form over it — a new, empty Flow showed "schema is invalid" instead of its General section.
    applies: (ctx) => ctx.element.type === FLOW_TYPE && startStage(ctx.element).choices > 0,
    schema: (ctx) => startStage(ctx.element).schema,
    // Doc 203 rule 16: a dangling startId reads as undefined — the picker shows empty rather than a
    // value `fieldAccepts` would refuse to write back. Clearing restores the Flow's fallback start.
    read: (ctx) => startStage(ctx.element).value,
    write: (_ctx, edit, value) =>
      setElement(edit, withOption(edit.element, 'startId', orCleared(value))),
  },
  {
    // Doc 202 rule 47: the review page is a Flow-level setting, so it sits with the Flow's other one.
    key: 'review',
    section: 'general',
    label: 'Show review before submission',
    applies: (ctx) => ctx.element.type === FLOW_TYPE,
    schema: () => ({
      type: 'boolean',
      description: 'Allow users to review details before submission.',
    }),
    // Doc 188: an inspector boolean asks for the compact switch rather than a checkbox.
    options: () => ({ component: 'switch', size: 'sm' }),
    // Absent reads as ON (rule 47): the review page is the default, so only an explicit `false` turns it off.
    read: (ctx) => optionsOf(ctx.element)['review'] !== false,
    // Written only when OFF: an option set to `true` is the same as no option, and the document stays minimal.
    write: (_ctx, edit, value) =>
      setElement(edit, withOption(edit.element, 'review', value === true ? undefined : false)),
  },
  {
    // NOT `description`: that key is the bound property's Description field, and a key names one inspector value.
    key: 'formDescription',
    section: 'general',
    label: 'Description',
    // Doc 215 rule 17: a Service takes the same Description. ONE predicate with the Title field above (rule 4) —
    // adding a boundary to one and not the other would give it a Title and no Description.
    applies: (ctx) => isPageRoot(ctx.element.type),
    /**
     * Doc 207 rules 30-31: RICH content now. The field schema is the rich text property shape, which is
     * what makes the inspector's own JSONForms dispatch the rich text control — the inspector reuses the
     * ui control set by reference, so no inspector-only renderer is involved.
     */
    schema: () => ({
      type: 'object',
      required: ['root'],
      description: 'Shown under the title.',
    }),
    // Doc 201 rule 22: the same placeholder the canvas shows for an unwritten description.
    options: () => ({ placeholder: FORM_DESCRIPTION_PLACEHOLDER }),
    read: (ctx) => richTextValue(optionsOf(ctx.element)['description']),
    // An emptied description is removed, like every other optional option.
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
