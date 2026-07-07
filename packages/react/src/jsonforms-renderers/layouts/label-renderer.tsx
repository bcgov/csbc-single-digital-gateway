import { rankWith, uiTypeIs } from '@jsonforms/core';
import type { LabelElement, LayoutProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Label } from '@repo/ui/label';
import { RichTextView, type RichTextViewProps } from '@repo/ui/rich-text-view';

export const labelRendererTester: RankedTester = rankWith(1, uiTypeIs('Label'));

/**
 * A `Label` uischema element. In addition to the plain JSONForms label, this renders the form
 * builder's **display-only** fields (feature 81), discriminated by `options.format`:
 * `heading` → `<h2>`/`<h3>`, `paragraph` → `<p>`, `richtext` → a read-only Lexical view. Display
 * fields have no schema property, so they render identically in the form and display renderer sets
 * (this one component is registered in both).
 */
type DisplayFormat = 'heading' | 'paragraph' | 'richtext';

type TextAlign = 'left' | 'center' | 'right';

const ALIGN_CLASS: Record<TextAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

interface DisplayLabel extends LabelElement {
  options?: { format?: DisplayFormat; level?: number; align?: TextAlign; content?: unknown };
}

function LabelRendererComponent({ uischema, visible }: LayoutProps) {
  if (visible === false) {
    return null;
  }
  const element = uischema as unknown as DisplayLabel;
  const { text } = element;
  const format = element.options?.format;

  if (format === 'heading') {
    const Tag = element.options?.level === 3 ? 'h3' : 'h2';
    const size = Tag === 'h3' ? 'text-lg' : 'text-xl';
    return <Tag className={`${size} font-semibold text-foreground`}>{text}</Tag>;
  }
  if (format === 'paragraph') {
    const align = ALIGN_CLASS[element.options?.align ?? 'left'];
    return (
      <p className={`whitespace-pre-line text-sm leading-relaxed text-muted-foreground ${align}`}>
        {text}
      </p>
    );
  }
  if (format === 'richtext') {
    const content = (element.options?.content ?? null) as Exclude<
      RichTextViewProps['value'],
      undefined
    >;
    return <RichTextView value={content} />;
  }
  return <Label className="text-sm">{text}</Label>;
}

export const LabelRenderer = withJsonFormsLayoutProps(LabelRendererComponent);
