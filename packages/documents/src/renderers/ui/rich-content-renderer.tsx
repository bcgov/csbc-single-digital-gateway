import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { RichTextView } from '@repo/ui/rich-text-view';
import { richTextValue, type RichTextState } from './rich-text-value';

/** `{ type: 'RichContent' }`, at the base rank (doc 250 rule 4). */
export const richContentTester = rankWith(1, uiTypeIs('RichContent'));

/** A RichContent element's `options.content`, when it is a usable editor state (rule 2). */
export function richContentOf(uischema: unknown): RichTextState | undefined {
  const options = (uischema as { options?: unknown } | undefined)?.options;
  return typeof options === 'object' && options !== null
    ? richTextValue((options as Record<string, unknown>)['content'])
    : undefined;
}

/** Authored formatted text, read-only (rule 4); empty or malformed content renders nothing. */
export function RichContentRenderer({ uischema, visible }: LayoutProps) {
  const content = richContentOf(uischema);
  if (!visible || content === undefined) return null;
  return (
    <div data-slot="rich-content">
      <RichTextView value={content} />
    </div>
  );
}

export const richContentEntry = {
  tester: richContentTester,
  renderer: withJsonFormsLayoutProps(RichContentRenderer),
};
