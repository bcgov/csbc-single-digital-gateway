import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import * as plain from '../renderers/plain/index';
import { ROOT_MESSAGE } from '../runner/document-runner';

export interface DocumentViewProps {
  readonly schema: JsonSchema;
  /** A variant root — a Form or a Funnel (doc 282 rule 2). */
  readonly uischema: Record<string, unknown>;
  /** The answers to read back. */
  readonly data: unknown;
}

/**
 * A document and its answers READ, not filled (doc 282): `schema` + `uischema` + `data` through the plain renderer set
 * — every answer as text, "Not answered" where blank — never writing, never validating, with no action bar. A Funnel
 * shows the Forms on the path its answers take, stacked. Fills its container and scrolls; prints in full.
 */
export function DocumentView({ schema, uischema, data }: DocumentViewProps) {
  const type = uischema['type'];
  if (type !== 'Form' && type !== 'Funnel')
    return (
      <p role="alert" data-slot="document-view-root-error" className="text-sm text-destructive">
        {ROOT_MESSAGE}
      </p>
    );
  return (
    <div
      data-slot="document-view"
      className="flex h-full min-h-0 flex-col print:block print:h-auto"
    >
      <div
        data-slot="document-view-content"
        className="min-h-0 flex-1 overflow-y-auto print:overflow-visible"
      >
        <JsonForms
          schema={schema}
          uischema={uischema as unknown as UISchemaElement}
          data={data}
          renderers={plain.renderers}
          cells={plain.cells}
          readonly
          validationMode="NoValidation"
        />
      </div>
    </div>
  );
}
