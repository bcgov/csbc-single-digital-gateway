import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { useState } from 'react';
import type { MultiStageDefinition } from './stage-model';

/** Lazily-loaded live preview of a multi-stage form — every stage's pages rendered through the real
 * renderers, top to bottom, sharing one data object (as a citizen would fill it in). */
export default function StagePreview({ definition }: { definition: MultiStageDefinition }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6">
      {(definition.stages ?? []).map((stage, index) => (
        <section key={stage.id} className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            {index + 1}. {stage.name}
          </h2>
          {stage.pages.map((page) => (
            <div
              key={page.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6"
            >
              <h3 className="text-sm font-medium text-foreground">{page.name}</h3>
              {page.description ? (
                <p className="text-sm text-muted-foreground">{page.description}</p>
              ) : null}
              <JsonForms
                schema={page.schema as JsonSchema}
                uischema={page.uischema as unknown as UISchemaElement}
                data={data}
                onChange={({ data: next }) => setData(next as Record<string, unknown>)}
              />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
