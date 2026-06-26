import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { useState } from 'react';
import type { FormDefinition } from './model';

/** Lazily-loaded live preview — renders the authored definition through the real renderers. */
export default function Preview({ definition }: { definition: FormDefinition }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  return (
    <div className="mx-auto w-full max-w-2xl overflow-y-auto p-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <JsonForms
          schema={definition.schema as JsonSchema}
          uischema={definition.uischema as unknown as UISchemaElement}
          data={data}
          onChange={({ data: next }) => setData(next as Record<string, unknown>)}
        />
      </div>
    </div>
  );
}
