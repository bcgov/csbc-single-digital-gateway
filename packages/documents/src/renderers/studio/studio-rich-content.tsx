import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { richContentOf } from '../ui/rich-content-renderer';
import { InlineRichText } from './inline-rich-text';
import { useStudioEditor } from './studio-editor';
import { ELEMENT_INSET, useStudioElement } from './studio-element';

/** Outranks the spread ui Rich content (doc 250 rule 7). */
export const studioRichContentTester = rankWith(2, uiTypeIs('RichContent'));

/** Rich content the author edits in place (doc 250 rules 7-12), writing `options.content` per change. */
export function StudioRichContentRenderer({ uischema, visible }: LayoutProps) {
  const editor = useStudioEditor();
  const element = useStudioElement();
  if (!visible) return null;
  return (
    <InlineRichText
      value={richContentOf(uischema)}
      placeholder="Rich content"
      label="Rich content"
      slot="rich-content"
      className={ELEMENT_INSET}
      editable={editor !== null && element !== null}
      onChange={(content) => {
        if (editor !== null && element !== null)
          editor.update(element.id, { options: { content } });
      }}
    />
  );
}

export const studioRichContentEntry = {
  tester: studioRichContentTester,
  renderer: withJsonFormsLayoutProps(StudioRichContentRenderer),
};
