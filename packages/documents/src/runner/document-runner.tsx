import type { UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { useState, type ReactNode } from 'react';
import * as defaults from '../renderers/default/index';
import type { FunnelError } from '../renderers/default/funnel/funnel-errors';
import { RunnerActions } from '../renderers/default/funnel/runner-actions';
import {
  DocumentRunnerProvider,
  useHostActions,
  type AnswersHandler,
  type DocumentRunnerPort,
} from '../renderers/default/funnel/runner-port';
import { SubmissionPreview } from '../renderers/default/funnel/submission-preview';

// `<DocumentRunner>` (doc 274 rules 35-39) — the one host-mounted entry point of the documents fill side, shaped like
// `@repo/forms`' `FormRunner`. ONE `<JsonForms>` over the document with `renderers/default`. A Funnel root is drawn by
// the Funnel renderer — the SAME one a bare `<JsonForms>` gets — which reads the host's handlers from the runner port;
// a Form root gets the page plus the action bar (Save draft and Submit, no Back).

/** Rule 39: the runner accepts a document from a host, so it says so rather than rendering nothing. */
export const ROOT_MESSAGE = 'The document must be a Form or a Funnel.';

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
}

export function DocumentRunner({
  schema,
  uischema,
  data,
  onChange,
  onSubmit,
  onSaveDraft,
}: DocumentRunnerProps) {
  const port: DocumentRunnerPort = {
    ...(onSubmit !== undefined && { onSubmit }),
    ...(onSaveDraft !== undefined && { onSaveDraft }),
  };
  // `null` until JSONForms reports its first validation: not yet known is not valid.
  const [errors, setErrors] = useState<readonly FunnelError[] | null>(null);
  const type = uischema['type'];
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
      onChange={({ data: next, errors: nextErrors }) => {
        setErrors(nextErrors ?? []);
        onChange(next);
      }}
    />
  );
  return (
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
    </DocumentRunnerProvider>
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
      <RunnerActions
        hasBack={false}
        atEnd
        // A Form root is its own page, so ANY error blocks Submit.
        submitBlocked={errors === null || errors.length > 0}
        busy={host.busy}
        canSaveDraft={host.canSaveDraft}
        onSaveDraft={host.saveDraft}
        onSubmit={host.finish}
      />
      <SubmissionPreview open={host.previewing} onOpenChange={host.setPreviewing} data={data} />
    </>
  );
}
