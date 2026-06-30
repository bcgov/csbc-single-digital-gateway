import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { Button } from '@repo/ui/button';
import { useMemo, useState } from 'react';
import { renderers } from '../jsonforms-renderers';

/** A single fillable page — mirrors a basic form (`schema`/`uischema`). */
export interface FormRunnerPage {
  id?: string;
  name?: string;
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

export interface FormRunnerStage {
  id?: string;
  name?: string;
  pages?: FormRunnerPage[];
}

export interface FormRunnerProps {
  /** `basic-form` renders one page; `multi-stage-form` renders a validated stepper. */
  kind: string;
  /** The form structure: `{ schema, uischema }` (basic) or `{ stages: [...] }` (multi-stage). */
  definition: Record<string, unknown>;
  /** The collected answers (controlled). */
  data: Record<string, unknown>;
  /** Fired on every edit — host persists drafts. */
  onChange?: (data: Record<string, unknown>) => void;
  /** Fired when the citizen submits a valid form. */
  onSubmit: (data: Record<string, unknown>) => void;
  submitting?: boolean;
  submitLabel?: string;
}

const VALIDATION = 'ValidateAndShow' as const;

/** Render one JSONForms page through the interactive renderers, reporting its error count. */
function Page({
  page,
  data,
  onChange,
}: {
  page: FormRunnerPage;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>, errorCount: number) => void;
}) {
  return (
    <JsonForms
      schema={page.schema as JsonSchema}
      uischema={page.uischema as unknown as UISchemaElement}
      data={data}
      renderers={renderers}
      cells={[]}
      validationMode={VALIDATION}
      onChange={({ data: next, errors }) =>
        onChange(next as Record<string, unknown>, errors?.length ?? 0)
      }
    />
  );
}

/** Single-page basic form with a validated Submit. */
function BasicRunner(props: FormRunnerProps) {
  const { definition, data, onChange, onSubmit, submitting, submitLabel } = props;
  const [errorCount, setErrorCount] = useState(0);
  const page: FormRunnerPage = {
    schema: (definition['schema'] as Record<string, unknown>) ?? {},
    uischema: (definition['uischema'] as Record<string, unknown>) ?? {},
  };
  return (
    <div className="space-y-6">
      <Page
        page={page}
        data={data}
        onChange={(next, count) => {
          onChange?.(next);
          setErrorCount(count);
        }}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          disabled={submitting === true || errorCount > 0}
          onClick={() => {
            if (errorCount === 0) onSubmit(data);
          }}
        >
          {submitLabel ?? 'Submit'}
        </Button>
      </div>
    </div>
  );
}

/** Multi-stage wizard: per-step validation gates Next/Submit; one shared data object across steps. */
function MultiStageRunner(props: FormRunnerProps) {
  const { definition, data, onChange, onSubmit, submitting, submitLabel } = props;
  const stages = (definition['stages'] as FormRunnerStage[] | undefined) ?? [];
  const steps = useMemo<FormRunnerPage[]>(
    () => stages.flatMap((stage) => stage.pages ?? []),
    [stages],
  );
  const [current, setCurrent] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const total = steps.length;
  const index = Math.min(current, Math.max(total - 1, 0));
  const step = steps[index];
  if (step === undefined) {
    return <p className="text-sm text-muted-foreground">This form has no pages to complete.</p>;
  }
  const isLast = index >= total - 1;

  return (
    <div className="space-y-6">
      <Page
        // Remount per step so validation re-evaluates against the new page's schema.
        key={step.id ?? index}
        page={step}
        data={data}
        onChange={(next, count) => {
          onChange?.(next);
          setErrorCount(count);
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={index === 0}
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
        >
          Back
        </Button>
        <span className="text-xs text-muted-foreground">
          Step {index + 1} of {total}
        </span>
        {isLast ? (
          <Button
            type="button"
            disabled={submitting === true || errorCount > 0}
            onClick={() => {
              if (errorCount === 0) onSubmit(data);
            }}
          >
            {submitLabel ?? 'Submit'}
          </Button>
        ) : (
          <Button type="button" disabled={errorCount > 0} onClick={() => setCurrent((c) => c + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Interactive, submittable form runner — the counterpart to the platform-web builder previews
 * (which never submit). Renders a basic form or a validated multi-stage wizard through the shared
 * `@repo/react` renderers, gating Next/Submit on the visible step's validation.
 */
export function FormRunner(props: FormRunnerProps) {
  return props.kind === 'multi-stage-form' ? (
    <MultiStageRunner {...props} />
  ) : (
    <BasicRunner {...props} />
  );
}
