import { Field, FieldLabel } from '@repo/ui/field';
import { NativeSelect, NativeSelectOption } from '@repo/ui/native-select';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  type DocumentType,
  documentTypeLabel,
  publishedTemplatesQueryOptions,
} from '@/lib/templates';

/**
 * Doc 228 — which template a new document of `type` is built from.
 *
 * Lists the published templates of `type` (the staff catalog). With exactly ONE there is nothing to
 * choose, so it is picked for the author and no control is drawn; with none the author is told why
 * they can't create yet; with several the choice is required. The caller owns the value and must
 * refuse to create while it is `undefined` — which covers loading, none, and not yet chosen.
 */
export function TemplateSelect({
  id,
  type,
  value,
  onChange,
}: {
  readonly id: string;
  readonly type: DocumentType;
  readonly value: string | undefined;
  readonly onChange: (templateId: string | undefined) => void;
}) {
  const { data, isPending, isError } = useQuery(publishedTemplatesQueryOptions());
  const options = (data ?? []).filter((entry) => entry.template.type === type);
  const only = options.length === 1 ? options[0]?.template.id : undefined;

  // Rule 3: a single template is the answer, not a question.
  useEffect(() => {
    if (only !== undefined && value !== only) onChange(only);
  }, [only, value, onChange]);

  if (isPending || only !== undefined) return null;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Templates could not be loaded.
      </p>
    );
  }
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No published {documentTypeLabel(type).toLowerCase()} template — ask an admin to publish one.
      </p>
    );
  }
  return (
    <Field>
      <FieldLabel htmlFor={id}>Template</FieldLabel>
      <NativeSelect
        id={id}
        required
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
      >
        <NativeSelectOption value="">Choose a template…</NativeSelectOption>
        {options.map((entry) => (
          <NativeSelectOption key={entry.template.id} value={entry.template.id}>
            {entry.published.title ?? 'Untitled template'}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}
