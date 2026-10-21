import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Heading } from '@repo/ui/heading';
import { DEFAULT_HEADING_LEVEL, headingOptions } from './heading-options';

/** `{ type: 'Heading' }`, at the base rank (doc 236 rule 3). */
export const headingTester = rankWith(1, uiTypeIs('Heading'));

/** A Heading element's text at its authored level and size (doc 236 rules 4-7); nothing when empty or hidden. */
export function HeadingRenderer({ uischema, visible }: LayoutProps) {
  const { text, level = DEFAULT_HEADING_LEVEL, size } = headingOptions(uischema.options);
  if (!visible || text === undefined || text.trim() === '') return null;
  return (
    <Heading data-slot="heading-element" level={level} {...(size !== undefined && { size })}>
      {text}
    </Heading>
  );
}

export const headingEntry = {
  tester: headingTester,
  renderer: withJsonFormsLayoutProps(HeadingRenderer),
};
