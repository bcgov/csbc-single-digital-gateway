import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';

interface AgreementEditorProps {
  definition: { schema: Record<string, unknown>; uischema: Record<string, unknown> };
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  readonly: boolean;
}

/**
 * The fixed-field agreement editor — a controlled `<JsonForms>` over the Service Agreement type's
 * definition (title, description, rich-text content, isOptional, approveLabel, rejectLabel). No form
 * builder: the fields are fixed by the seeded type. Shared by the console + admin surfaces.
 */
export function AgreementEditor({ definition, data, onChange, readonly }: AgreementEditorProps) {
  return (
    <JsonForms
      schema={definition.schema as JsonSchema}
      uischema={definition.uischema as unknown as UISchemaElement}
      data={data}
      readonly={readonly}
      onChange={({ data: next }) => {
        if (!readonly) {
          onChange(next as Record<string, unknown>);
        }
      }}
    />
  );
}
