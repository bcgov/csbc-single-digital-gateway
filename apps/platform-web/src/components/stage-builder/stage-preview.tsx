import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Button } from '@repo/ui/button';
import { useMemo, useState } from 'react';
import type { MultiStageDefinition, StagePage } from './stage-model';

/** Lazily-loaded live preview of a multi-stage form as a stepper: a legend of stages → pages on the
 * left, the current page rendered through the real renderers, and a "Step x of y" counter. */
export default function StagePreview({ definition }: { definition: MultiStageDefinition }) {
  const steps = useMemo<StagePage[]>(
    () => (definition.stages ?? []).flatMap((stage) => stage.pages),
    [definition],
  );
  const [current, setCurrent] = useState(0);
  const [data, setData] = useState<Record<string, unknown>>({});
  const total = steps.length;
  const stepIndex = Math.min(current, total - 1);
  const step = steps[stepIndex];

  if (!step) {
    return <p className="p-6 text-sm text-muted-foreground">Add a page to preview the form.</p>;
  }

  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-border bg-card p-3">
        <ol className="flex flex-col gap-3">
          {(definition.stages ?? []).map((stage, stageIndex) => (
            <li key={stage.id} className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {stageIndex + 1}. {stage.name}
              </p>
              <ul className="flex flex-col gap-0.5">
                {stage.pages.map((page) => {
                  const index = steps.findIndex((s) => s.id === page.id);
                  const active = index === stepIndex;
                  return (
                    <li key={page.id}>
                      <button
                        type="button"
                        onClick={() => setCurrent(index)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm ${
                          active
                            ? 'bg-accent font-medium text-accent-foreground'
                            : 'text-muted-foreground hover:bg-accent/50'
                        }`}
                      >
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="truncate">{page.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-end border-b border-border px-6 py-3">
          <span className="text-sm text-muted-foreground">
            Step {stepIndex + 1} of {total}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-6">
            <JsonForms
              schema={step.schema as JsonSchema}
              uischema={step.uischema as unknown as UISchemaElement}
              data={data}
              onChange={({ data: next }) => setData(next as Record<string, unknown>)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-3">
          <Button
            type="button"
            variant="outline"
            disabled={stepIndex === 0}
            onClick={() => setCurrent(stepIndex - 1)}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={stepIndex >= total - 1}
            onClick={() => setCurrent(stepIndex + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
