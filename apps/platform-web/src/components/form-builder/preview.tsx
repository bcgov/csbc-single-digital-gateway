import { FormRunner } from '@repo/react/form-runner';
import { useState } from 'react';
import type { FormDefinition } from './model';

/**
 * Lazily-loaded live preview — renders the authored definition through the shared FormRunner in
 * no-submit (preview) mode, so the builder preview and the citizen application use one component.
 */
export default function Preview({ definition }: { definition: FormDefinition }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  return (
    <div className="mx-auto w-full max-w-2xl overflow-y-auto p-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <FormRunner
          kind="basic-form"
          definition={definition as unknown as Record<string, unknown>}
          data={data}
          onChange={setData}
        />
      </div>
    </div>
  );
}
