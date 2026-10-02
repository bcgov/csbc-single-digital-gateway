import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { SeparatorElement } from '../ui/separator-renderer';

/** Outranks the spread ui Separator (doc 240 rule 1). */
export const studioSeparatorTester = rankWith(2, uiTypeIs('Separator'));

/** The rule padded like the studio Heading, so the 1px line is a 17px row to select and drag (doc 240 rule 4). */
export function StudioSeparatorRenderer({ visible }: LayoutProps) {
  return visible ? <SeparatorElement className="p-2" /> : null;
}

export const studioSeparatorEntry = {
  tester: studioSeparatorTester,
  renderer: withJsonFormsLayoutProps(StudioSeparatorRenderer),
};
