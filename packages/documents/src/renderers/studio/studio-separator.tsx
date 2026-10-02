import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { SeparatorElement } from '../ui/separator-renderer';
import { ELEMENT_INSET } from './studio-element';

/** Outranks the spread ui Separator (doc 240 rule 1). */
export const studioSeparatorTester = rankWith(2, uiTypeIs('Separator'));

/** The rule padded like every studio element, so the 1px line is a row to select and drag (doc 240 rule 4, doc 254 rule 7). */
export function StudioSeparatorRenderer({ visible }: LayoutProps) {
  return visible ? <SeparatorElement className={ELEMENT_INSET} /> : null;
}

export const studioSeparatorEntry = {
  tester: studioSeparatorTester,
  renderer: withJsonFormsLayoutProps(StudioSeparatorRenderer),
};
