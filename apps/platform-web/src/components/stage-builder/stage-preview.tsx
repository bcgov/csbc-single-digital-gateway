import { FormRunner } from '@repo/react/form-runner';
import { useState } from 'react';
import type { MultiStageDefinition } from './stage-model';

/**
 * Lazily-loaded live preview of a multi-stage form, rendered through the shared FormRunner in
 * no-submit (preview) mode — the stage/page legend + per-step stepper now live in the runner, so
 * the builder preview and the citizen application share one component.
 */
export default function StagePreview({ definition }: { definition: MultiStageDefinition }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  return (
    <div className="h-full overflow-y-auto p-6">
      <FormRunner
        kind="multi-stage-form"
        definition={definition as unknown as Record<string, unknown>}
        data={data}
        onChange={setData}
      />
    </div>
  );
}
