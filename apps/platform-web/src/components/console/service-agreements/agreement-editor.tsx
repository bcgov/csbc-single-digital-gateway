import { DefinitionEditor } from '@/components/admin/templates/definition-editor';

/**
 * The agreement content editor.
 *
 * Feature 217: this was a controlled `<JsonForms>` over the Service Agreement TYPE's definition,
 * editing the version's filled `data` (title, description, rich-text content, isOptional,
 * approveLabel, rejectLabel). An agreement is AUTHORED now — its version carries one `content` (a
 * `@repo/forms` StudioDocument) — and the JSONForms renderers are gone, so this is the same Monaco
 * JSON editor the templates admin uses, until the Form Studio is wired to the documents API.
 */
export function AgreementEditor({
  value,
  onChange,
  readonly,
}: {
  /** The version's `content`, as formatted JSON text. */
  value: string;
  onChange: (text: string) => void;
  readonly: boolean;
}) {
  return <DefinitionEditor value={value} onChange={onChange} readOnly={readonly} />;
}
