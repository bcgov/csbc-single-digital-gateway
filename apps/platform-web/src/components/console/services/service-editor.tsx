import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';

interface Definition {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

/** The service version's JSONForms form (controlled). Save draft / Publish live in the detail header
 * (the detail owns the data + dirty state); this is just the rendered form. */
export function ServiceEditor({
  definition,
  data,
  onChange,
  readonly = false,
}: {
  definition: Definition;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  readonly?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
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
    </div>
  );
}
