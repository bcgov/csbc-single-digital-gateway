import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { DEFAULT_HEADING_LEVEL, headingOptions } from '../ui/heading-options';
import { InlineEditableHeading } from './inline-heading';
import { useStudioEditor } from './studio-editor';
import { useStudioElement } from './studio-element';

/** Outranks the spread ui Heading (doc 236 rule 21). */
export const studioHeadingTester = rankWith(2, uiTypeIs('Heading'));

/**
 * A Heading the author edits in place (doc 236 rules 21-25): one click selects it (the wrapper) AND edits its
 * `options.text`; cleared text removes the key.
 */
export function StudioHeadingRenderer({ uischema, visible }: LayoutProps) {
  const editor = useStudioEditor();
  const element = useStudioElement();
  const { text = '', level = DEFAULT_HEADING_LEVEL, size } = headingOptions(uischema.options);
  if (!visible) return null;
  return (
    <InlineEditableHeading
      text={text}
      placeholder="Heading"
      level={level}
      size={size}
      slot="heading-element"
      editLabel="Heading text"
      editable={editor !== null && element !== null}
      onCommit={(next) => {
        if (editor === null || element === null) return;
        editor.update(element.id, { options: { text: next === '' ? undefined : next } });
      }}
    />
  );
}

export const studioHeadingEntry = {
  tester: studioHeadingTester,
  renderer: withJsonFormsLayoutProps(StudioHeadingRenderer),
};
