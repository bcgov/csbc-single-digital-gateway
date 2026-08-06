import { Label } from '@repo/ui/label';
import { RichTextInput, type RichTextInputProps } from '@repo/ui/rich-text-input';
import { Textarea } from '@repo/ui/textarea';
import { ClearableInput } from './clearable-input';
import type { DisplayNode, Path, TextAlign } from './model';

/** Tailwind text-align class per alignment (shared shape with the LabelRenderer). */
export const ALIGN_CLASS: Record<TextAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const FIELD_LABEL: Record<DisplayNode['displayType'], string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  richtext: 'Content',
};

/**
 * The canvas body for a display-only field (heading / paragraph / rich text). Its **content** is
 * edited inline (there is no data to collect, so the content itself is the control); configuration
 * (heading level, paragraph alignment) lives in the inspector. The editors use the same labeled,
 * bordered `Input`/`Textarea` chrome as the form Title/Description fields — the heading just keeps
 * its selected H2/H3 size, and the paragraph its rendered size (overriding the design-system
 * `md:text-xs`, which would otherwise shrink both at md+ width).
 */
export function DisplayCard({
  node,
  path,
  onChange,
}: {
  node: DisplayNode;
  path: Path;
  onChange: (path: Path, patch: Partial<DisplayNode>) => void;
}) {
  const fieldId = `display-${node.id}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>{FIELD_LABEL[node.displayType]}</Label>
      {node.displayType === 'heading' ? (
        <ClearableInput
          id={fieldId}
          placeholder="Heading"
          value={node.text}
          onChange={(e) => onChange(path, { text: e.target.value })}
          onClear={() => onChange(path, { text: '' })}
          className={`h-auto py-1.5 font-semibold ${
            (node.level ?? 2) === 3 ? 'text-lg md:text-lg' : 'text-xl md:text-xl'
          }`}
        />
      ) : node.displayType === 'paragraph' ? (
        <Textarea
          id={fieldId}
          placeholder="Paragraph text"
          rows={3}
          value={node.text}
          onChange={(e) => onChange(path, { text: e.target.value })}
          className={`text-sm md:text-sm ${ALIGN_CLASS[node.align ?? 'left']}`}
        />
      ) : (
        <RichTextInput
          id={fieldId}
          value={(node.content ?? null) as Exclude<RichTextInputProps['value'], undefined>}
          onChange={(value) => onChange(path, { content: value })}
        />
      )}
    </div>
  );
}
