import { FORM_DESCRIPTION_PLACEHOLDER } from '../../renderers/gridstack/form-renderer';
import { FORM_TYPE } from '../../renderers/gridstack/grid-layouts';
import { FLOW_TYPE } from '../../renderers/xyflow/flow-elements';
import { startStage, STRING } from './field-schemas';
import { optionsOf, orCleared, setElement, text, withOption } from './inspector-edits';
import type { InspectorField } from './inspector-fields';

// The General-section settings that belong to a document's own roots — a Flow's start stage (doc 203) and a Form's
// description (doc 201 rule 20) — split out of inspector-fields.ts, which is at the file-size gate. Placed right after
// Label, in rendered order.

export const DOCUMENT_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'startId',
    section: 'general',
    label: 'Start stage',
    applies: (ctx) => ctx.element.type === FLOW_TYPE,
    schema: (ctx) => startStage(ctx.element).schema,
    // Doc 203 rule 16: a dangling startId reads as undefined — the picker shows empty rather than a
    // value `fieldAccepts` would refuse to write back. Clearing restores the Flow's fallback start.
    read: (ctx) => startStage(ctx.element).value,
    write: (_ctx, edit, value) =>
      setElement(edit, withOption(edit.element, 'startId', orCleared(value))),
  },
  {
    // NOT `description`: that key is the bound property's Description field, and a key names one inspector value.
    key: 'formDescription',
    section: 'general',
    label: 'Description',
    applies: (ctx) => ctx.element.type === FORM_TYPE,
    schema: () => ({ ...STRING, description: 'Shown under the title.' }),
    // Doc 201 rule 22: the same placeholder the canvas shows for an unwritten description.
    options: () => ({ component: 'textarea', placeholder: FORM_DESCRIPTION_PLACEHOLDER }),
    read: (ctx) => text(optionsOf(ctx.element)['description']),
    // An emptied description is removed, like every other optional option.
    write: (_ctx, edit, value) =>
      setElement(edit, withOption(edit.element, 'description', orCleared(value))),
  },
] satisfies InspectorField[]);
