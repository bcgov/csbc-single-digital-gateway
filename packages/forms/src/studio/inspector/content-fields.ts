import { richTextIsEmpty, richTextValue } from '../../renderers/ui/rich-text-value';
import { setElement, withElementKey } from './inspector-edits';
import type { InspectorField } from './inspector-fields';

// Doc 207 rule 21 — the `RichContent` element's authored content.
//
// Its own module, not `inspector-fields.ts`, which is already over the 300-line gate (the reason
// `document-fields.ts` and `mask-number-fields.ts` were split out too).
//
// The field's SCHEMA is the rich text property shape, which is what makes the inspector's own JSONForms
// dispatch the rich text control: `renderers/studio-inspector` reuses the ui control set BY REFERENCE
// (`index.ts:13`), so no inspector-only renderer exists or is needed.

export const RICH_CONTENT_TYPE = 'RichContent';

export const CONTENT_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'content',
    section: 'general',
    label: 'Content',
    applies: (ctx) => ctx.element.type === RICH_CONTENT_TYPE,
    schema: () => ({
      type: 'object',
      required: ['root'],
      description: 'The formatted content shown in the form.',
    }),
    read: (ctx) => richTextValue((ctx.element as { content?: unknown }).content),
    /**
     * Rule 5: an editor with no TEXT clears the key. The value is still an object, so a presence check
     * would leave content behind that renders nothing — and an element with an empty state would look
     * authored in the code panel while showing nothing on the canvas.
     */
    write: (_ctx, edit, value) =>
      setElement(
        edit,
        withElementKey(
          edit.element,
          'content',
          richTextIsEmpty(richTextValue(value)) ? undefined : value,
        ),
      ),
  },
] satisfies InspectorField[]);
