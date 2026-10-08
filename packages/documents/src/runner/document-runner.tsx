import type { UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { useState, type ReactNode } from 'react';
import * as defaults from '../renderers/default/index';
import { withReferences, type DocumentReferenceSource } from '../renderers/ui/reference-source';
import type { FunnelError } from '../renderers/default/funnel/funnel-errors';
import { RunnerActions } from '../renderers/default/funnel/runner-actions';
import {
  DocumentRunnerProvider,
  useHostActions,
  type AnswersHandler,
  type DocumentRunnerPort,
} from '../renderers/default/funnel/runner-port';
import { SubmissionPreview } from '../renderers/default/funnel/submission-preview';
import { isDisplayOnly } from '../studio/variants/display-only';

// `<DocumentRunner>` (doc 274 rules 35-39) — the one host-mounted entry point of the documents fill side, shaped like
// `@repo/forms`' `FormRunner`. ONE `<JsonForms>` over the document with `renderers/default`. A Funnel root is drawn by
// the Funnel renderer — the SAME one a bare `<JsonForms>` gets — which reads the host's handlers from the runner port;
// a Form root gets the page plus the action bar (Save draft and Submit, no Back).

/** Rule 39: the runner accepts a document from a host, so it says so rather than rendering nothing. */
export const ROOT_MESSAGE = 'The document must be a Form or a Funnel.';
/** Doc 284 rule 6. */
export const DISPLAY_ONLY_MESSAGE = "This version is display only and can't be filled in.";

export interface DocumentRunnerProps {
  readonly schema: Record<string, unknown>;
  /** A variant root: a `Form` or a `Funnel`. */
  readonly uischema: Record<string, unknown>;
  /** The answers — controlled by the host. */
  readonly data: unknown;
  onChange(data: unknown): void;
  /** Without one, Submit shows the payload that would be submitted (rule 18). */
  readonly onSubmit?: AnswersHandler;
  /** Without one, Save draft renders disabled (rule 37). */
  readonly onSaveDraft?: AnswersHandler;
  /**
   * Doc 276: a document nobody may fill — a published template, or a staff view of a published service. Controls draw
   * read-only (JSONForms `readonly`), nothing validates (a blank document would otherwise paint every required field
   * red), Save draft and Submit are refused, and a Funnel's navigation stays free.
   */
  readonly disabled?: boolean;
  /** Doc 276: `false` draws no action bar. */
  readonly actions?: boolean;
  /** Doc 276: whether the answers validate, after every change. Never called while `disabled` (nothing validates). */
  onValidityChange?(valid: boolean): void;
  /** Doc 281 rule 21a: `false` hides the final Submit — for a host that publishes from its own header. */
  readonly submit?: boolean;
  /** Doc 287: the host's documents for document reference controls. Absent = an outer provider's, if any. */
  readonly references?: DocumentReferenceSource | undefined;
}

export function DocumentRunner({
  schema,
  uischema,
  data,
  onChange,
  onSubmit,
  onSaveDraft,
  disabled = false,
  actions = true,
  onValidityChange,
  submit = true,
  references,
}: DocumentRunnerProps) {
  const port: DocumentRunnerPort = {
    ...(onSubmit !== undefined && { onSubmit }),
    ...(onSaveDraft !== undefined && { onSaveDraft }),
    disabled,
    actions,
    submit,
  };
  // `null` until JSONForms reports its first validation: not yet known is not valid.
  const [errors, setErrors] = useState<readonly FunnelError[] | null>(null);
  const type = uischema['type'];
  // Doc 284 rule 6: a display-only variant presents the document; nothing fills it in.
  if (isDisplayOnly(uischema))
    return (
      <p role="alert" data-slot="runner-display-only" className="text-sm text-muted-foreground">
        {DISPLAY_ONLY_MESSAGE}
      </p>
    );
  if (type !== 'Form' && type !== 'Funnel')
    return (
      <p role="alert" data-slot="runner-root-error" className="text-sm text-destructive">
        {ROOT_MESSAGE}
      </p>
    );
  const form = (
    <JsonForms
      schema={schema}
      uischema={uischema as unknown as UISchemaElement}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
      {...(disabled && { readonly: true, validationMode: 'NoValidation' as const })}
      onChange={({ data: next, errors: nextErrors }) => {
        setErrors(nextErrors ?? []);
        if (!disabled) onValidityChange?.((nextErrors ?? []).length === 0);
        onChange(next);
      }}
    />
  );
  return withReferences(
    references,
    <DocumentRunnerProvider value={port}>
      <div data-slot="document-runner" className="flex h-full min-h-0 flex-col">
        {type === 'Funnel' ? (
          form
        ) : (
          <FormPage port={port} data={data} errors={errors}>
            {form}
          </FormPage>
        )}
      </div>
    </DocumentRunnerProvider>,
  );
}

/** Rule 36: a Form root — its page in a scrolling column (the Form insets itself), the action bar under it. */
function FormPage({
  port,
  data,
  errors,
  children,
}: {
  readonly port: DocumentRunnerPort;
  readonly data: unknown;
  readonly errors: readonly FunnelError[] | null;
  readonly children: ReactNode;
}) {
  const host = useHostActions(port, data);
  return (
    <>
      <div data-slot="runner-content" className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
      {host.actions && (
        <RunnerActions
          hasBack={false}
          atEnd
          // A Form root is its own page, so ANY error blocks Submit; a disabled one refuses it outright.
          submitBlocked={host.disabled || errors === null || errors.length > 0}
          busy={host.busy}
          canSaveDraft={host.canSaveDraft}
          showSubmit={host.submit}
          onSaveDraft={host.saveDraft}
          onSubmit={host.finish}
        />
      )}
      <SubmissionPreview open={host.previewing} onOpenChange={host.setPreviewing} data={data} />
    </>
  );
}
