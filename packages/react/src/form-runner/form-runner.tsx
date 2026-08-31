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
  /**
   * Fired when a valid form is submitted. OMIT to run in no-submit (preview) mode — the form is
   * still fillable + navigable, but renders no Submit affordance.
   */
  onSubmit?: ((data: Record<string, unknown>) => void) | undefined;
  submitting?: boolean;
  submitLabel?: string;
  /**
   * Fill the host's height instead of growing with content, so a renderer that wants its own
   * internal scroll region (the Categorization flow layout) gets a definite height box to divide.
   * Opt-in: the default keeps the content-height flow every other caller relies on.
   */
  fill?: boolean;
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

/** Single-page basic form. Renders a validated Submit only when `onSubmit` is provided. */
function BasicRunner(props: FormRunnerProps) {
  const { definition, data, onChange, onSubmit, submitting, submitLabel, fill } = props;
  const [errorCount, setErrorCount] = useState(0);
  const page: FormRunnerPage = {
    schema: (definition['schema'] as Record<string, unknown>) ?? {},
    uischema: (definition['uischema'] as Record<string, unknown>) ?? {},
  };
  return (
    <div className={fill === true ? 'flex h-full min-h-0 flex-col' : 'space-y-6'}>
      <Page
        page={page}
        data={data}
        onChange={(next, count) => {
          onChange?.(next);
          setErrorCount(count);
        }}
      />
      {onSubmit ? (
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
      ) : null}
    </div>
  );
}

/** Left rail listing stages → pages; the active page is highlighted and any page is jumpable. */
function StageLegend({
  stages,
  steps,
  index,
  onJump,
}: {
  stages: FormRunnerStage[];
  steps: FormRunnerPage[];
  index: number;
  onJump: (index: number) => void;
}) {
  return (
    <nav aria-label="Form steps" className="hidden shrink-0 lg:block lg:w-56">
      <ol className="flex flex-col gap-3">
        {stages.map((stage, stageIndex) => (
          <li key={stage.id ?? stageIndex} className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {stageIndex + 1}. {stage.name ?? `Stage ${stageIndex + 1}`}
            </p>
            <ul className="flex flex-col gap-0.5">
              {(stage.pages ?? []).map((page) => {
                const i = steps.indexOf(page);
                const active = i === index;
                return (
                  <li key={page.id ?? i}>
                    <button
                      type="button"
                      onClick={() => onJump(i)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm ${
                        active
                          ? 'bg-accent font-medium text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50'
                      }`}
                    >
                      <span className="text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                      <span className="truncate">{page.name ?? `Page ${i + 1}`}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Multi-stage wizard: a stage/page legend beside the current page, with per-step validation gating
 * Next/Submit. One shared data object across steps. Renders Submit on the last step only when
 * `onSubmit` is provided (otherwise it's a no-submit preview).
 */
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
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <StageLegend stages={stages} steps={steps} index={index} onJump={setCurrent} />
      <div className="min-w-0 flex-1 space-y-6">
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
            onSubmit ? (
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
              <span className="w-16" aria-hidden />
            )
          ) : (
            <Button
              type="button"
              disabled={errorCount > 0}
              onClick={() => setCurrent((c) => c + 1)}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive form runner — the submittable counterpart to platform-web's builder previews. Renders
 * a basic form or a validated multi-stage wizard (stage/page legend) through the shared `@repo/react`
 * renderers, gating Next/Submit on the visible step's validation. Omit `onSubmit` for a no-submit
 * preview (fillable + navigable, no Submit) so the same component serves previews and real applications.
 */
export function FormRunner(props: FormRunnerProps) {
  return props.kind === 'multi-stage-form' ? (
    <MultiStageRunner {...props} />
  ) : (
    <BasicRunner {...props} />
  );
}
