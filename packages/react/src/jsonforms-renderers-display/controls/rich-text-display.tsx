import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { RichTextView, type RichTextViewProps } from '@repo/ui/rich-text-view';
import { DisplayField, EmptyValue } from '../util/display-field';

export const richTextDisplayTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'richtext')),
);

function RichTextDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) return null;
  const value = (data ?? null) as RichTextViewProps['value'];
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {value ? <RichTextView value={value} /> : <EmptyValue />}
    </DisplayField>
  );
}

export const RichTextDisplay = withJsonFormsControlProps(RichTextDisplayComponent);
