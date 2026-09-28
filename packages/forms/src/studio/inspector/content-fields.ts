import { RICH_CONTENT_PLACEHOLDER } from '../../renderers/gridstack/element-placeholders';
import { richTextIsEmpty, richTextValue } from '../../renderers/ui/rich-text-value';
import { optionField } from './field-factory';
import { STRING } from './field-schemas';
import { setElement, text, withElementKey } from './inspector-edits';
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
    // The inspector's own editor says the same thing the canvas does when the block is empty, rather
    // than `RichTextInput`'s generic default — the two are editing one value and should agree.
    options: () => ({ placeholder: RICH_CONTENT_PLACEHOLDER }),
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
  /**
   * Doc 207 rule 36: the empty-state text of the block's own editor.
   *
   * A `RichContent` COLLECTS NOTHING, so unlike a field's placeholder this one is never seen by a
   * citizen — an empty block renders nothing in a fillable form, and still does. It is authoring
   * guidance: what the author (or the next author) sees in the inline editor instead of "Write…".
   * Worth authoring precisely because a template can hand a block to someone else to fill in.
   */
  {
    ...optionField(
      'placeholder',
      'general',
      'Placeholder',
      (ctx) => ctx.element.type === RICH_CONTENT_TYPE,
      STRING,
      text,
    ),
    // The wording the block falls back to, so the input shows what leaving it blank will do — the idiom
    // the Form description field already uses. Imported from the React-FREE placeholder module: these
    // field definitions are read by `checkCapabilities` inside platform-api, so a constant reached
    // through a renderer would drag React (and gridstack) into the Nest process.
    options: () => ({ placeholder: RICH_CONTENT_PLACEHOLDER }),
  },
] satisfies InspectorField[]);
