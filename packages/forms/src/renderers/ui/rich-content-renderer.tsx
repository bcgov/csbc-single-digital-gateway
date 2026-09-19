import { rankWith, uiTypeIs, type LabelProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsLabelProps } from '@jsonforms/react';
import { RichTextView } from '@repo/ui/rich-text-view';
import { richTextValue } from './rich-text-value';

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
  if (!visible) return null;
  // Rule 4: a malformed object crashes Lexical, and the code panel can author one.
  const content = richTextValue((uischema as { content?: unknown }).content);
  if (content === undefined) return null;
  return <RichTextView value={content} />;
}

export const RichContentDisplayRenderer = withJsonFormsLabelProps(RichContentRenderer);
