import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Separator } from '@repo/ui/separator';

/** `{ type: 'Separator' }`, at the base rank (doc 240 rule 1). */
export const separatorTester = rankWith(1, uiTypeIs('Separator'));

/** A horizontal rule (doc 240 rules 2-3); `className` lets the studio pad it. Reads nothing authored. */
export function SeparatorElement({ className }: { className?: string }) {
  return (
    <div data-slot="separator-element" {...(className !== undefined && { className })}>
      <Separator orientation="horizontal" />
    </div>
  );
}

export function SeparatorRenderer({ visible }: LayoutProps) {
  return visible ? <SeparatorElement /> : null;
}

export const separatorEntry = {
  tester: separatorTester,
  renderer: withJsonFormsLayoutProps(SeparatorRenderer),
};
