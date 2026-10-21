import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { useMemo } from 'react';
import * as plain from '../renderers/plain/index';
import { NothingAnswered } from '../renderers/plain/nothing-answered';
import { PlainOptionsContext, type Unanswered } from '../renderers/plain/plain-options';
import { SectionAnchorsContext } from '../renderers/default/section-anchor';
import { ROOT_MESSAGE } from '../runner/document-runner';
import { withReferences, type DocumentReferenceSource } from '../renderers/ui/reference-source';
import { shownUischema, viewSections } from './view-sections';

export interface DocumentViewProps {
  readonly schema: JsonSchema;
  /** A variant root — a Form or a Funnel (doc 282 rule 2). */
  readonly uischema: Record<string, unknown>;
  /** The answers to read back. */
  readonly data: unknown;
  /**
   * Doc 283: blanks shown as "Not answered" (default — a submission, an agreement: what was left blank matters), or
   * hidden with every container left without an answer (a service's details).
   */
  readonly unanswered?: Unanswered | undefined;
  /**
   * Put each outermost titled Section's `viewSections` anchor on it as its DOM id, so a host can link to it (an "On
   * this page" nav). Off by default: authored ids are not unique across views sharing a page.
   */
  readonly anchorSections?: boolean | undefined;
  /** Doc 287: where a document reference's titles link to. Absent = an outer provider's, if any. */
  readonly references?: DocumentReferenceSource | undefined;
}

/**
 * A document and its answers READ, not filled (doc 282): `schema` + `uischema` + `data` through the plain renderer set
 * — every answer as text, "Not answered" where blank — never writing, never validating, with no action bar. A Funnel
 * shows the Forms on the path its answers take, stacked. Fills its container and scrolls; prints in full.
 */
export function DocumentView({
  schema,
  uischema,
  data,
  unanswered = 'show',
  anchorSections = false,
  references,
}: DocumentViewProps) {
  const type = uischema['type'];
  // Doc 283: a Form root is pruned here; a Funnel prunes each Form on its path (its graph names Forms by id).
  const shown = useMemo(
    () => shownUischema({ schema, uischema, data, unanswered }),
    [unanswered, uischema, schema, data],
  );
  const anchors = useMemo(
    () =>
      new Map(
        anchorSections
          ? viewSections({ schema, uischema, data, unanswered }).map((s) => [s.elementId, s.anchor])
          : [],
      ),
    [anchorSections, unanswered, uischema, schema, data],
  );
  const options = useMemo(() => ({ unanswered }), [unanswered]);
  if (type !== 'Form' && type !== 'Funnel')
    return (
      <p role="alert" data-slot="document-view-root-error" className="text-sm text-destructive">
        {ROOT_MESSAGE}
      </p>
    );
  return withReferences(
    references,
    <div
      data-slot="document-view"
      className="flex h-full min-h-0 flex-col print:block print:h-auto"
    >
      <div
        data-slot="document-view-content"
        className="min-h-0 flex-1 overflow-y-auto print:overflow-visible"
      >
        {shown === undefined ? (
          <NothingAnswered />
        ) : (
          <PlainOptionsContext value={options}>
            <SectionAnchorsContext value={anchors}>
              <JsonForms
                schema={schema}
                uischema={shown as unknown as UISchemaElement}
                data={data}
                renderers={plain.renderers}
                cells={plain.cells}
                readonly
                validationMode="NoValidation"
              />
            </SectionAnchorsContext>
          </PlainOptionsContext>
        )}
      </div>
    </div>,
  );
}
