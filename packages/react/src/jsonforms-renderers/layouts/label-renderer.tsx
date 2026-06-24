import { rankWith, uiTypeIs } from '@jsonforms/core';
import type { LabelElement, LayoutProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Label } from '@repo/ui/label';

export const labelRendererTester: RankedTester = rankWith(1, uiTypeIs('Label'));

function LabelRendererComponent({ uischema, visible }: LayoutProps) {
  if (visible === false) {
    return null;
  }
  const text = (uischema as unknown as LabelElement).text;
  return <Label className="text-sm">{text}</Label>;
}

export const LabelRenderer = withJsonFormsLayoutProps(LabelRendererComponent);
