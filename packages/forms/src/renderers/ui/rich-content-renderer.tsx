import { rankWith, uiTypeIs, type LabelProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsLabelProps } from '@jsonforms/react';
import { RichTextView } from '@repo/ui/rich-text-view';
import { RICH_CONTENT_PLACEHOLDER } from '../gridstack/element-placeholders';
import { richTextConfig } from './rich-text-options';
import { EMPTY_RICH_TEXT, richTextValue } from './rich-text-value';
import { useInlineEditable } from './inline-editable';

/**
 * Doc 207 rule 18: `{ type: 'RichContent', content }`. Rank 1 like the other display testers — each matches
 * a distinct element type, so they never contend.
 */
export const richContentTester: RankedTester = rankWith(1, uiTypeIs('RichContent'));

/**
 * Renders authored rich content read-only (rule 19). It collects nothing and binds to no data — the display
 * counterpart of the rich text control, and the rich counterpart of `Heading`.
 *
 * `content` is read from the TOP LEVEL of the element, like `Heading.text`, never from `options` — doc 180
 * keeps `options` as an allow-listed settings bag rather than a content store.
 *
 * Mapped through `withJsonFormsLabelProps` so `visible` has the element's `rule` applied, exactly as Heading
 * is. Empty or malformed content renders nothing, as an empty Heading does (rule 23); in the studio the
 * element is still framed and selectable, so it does not disappear from the author.
 */
function RichContentRenderer({ visible, uischema }: LabelProps) {
  // Doc 223: the read-only passthrough everywhere but the studio canvas, so a citizen's form renders
  // the same DOM. Declared before the early returns — a hook may not be called conditionally.
  const Editable = useInlineEditable();
  if (!visible) return null;
  // Rule 4: a malformed object crashes Lexical, and the code panel can author one.
  const content = richTextValue((uischema as { content?: unknown }).content);
  /**
   * Doc 207 rule 36: the authored empty-state text of the inline editor, sanitised by the SAME
   * `richTextConfig` the control uses — one definition of what a placeholder is (a non-empty string),
   * so a blank or wrong-typed one falls back here exactly as it does on a field.
   *
   * Only `placeholder` is read: the rest of that config is a CONTROL's (toolbar, rows, readOnly), and a
   * display element has no use for any of it.
   */
  const { placeholder = RICH_CONTENT_PLACEHOLDER } = richTextConfig(uischema.options);

  /**
   * Doc 223: unlike every other surface this one can be EMPTY and still needs an editor — a Rich Text
   * block dragged from the palette has no content at all, and rule 23 renders nothing for it. Outside
   * the studio that stays true; on the canvas the author gets an editor to fill instead of an element
   * they cannot click into.
   */
  return (
    <Editable
      element={uischema}
      fieldKey="content"
      value={content ?? EMPTY_RICH_TEXT}
      placeholder={placeholder}
      // Rule 10b: `bare` takes its typography from the container, so the editor names what its read
      // view renders with — `RichTextView`'s own `text-sm leading-relaxed`.
      inputClassName="text-sm leading-relaxed"
    >
      {content === undefined ? null : <RichTextView value={content} />}
    </Editable>
  );
}

export const RichContentDisplayRenderer = withJsonFormsLabelProps(RichContentRenderer);
