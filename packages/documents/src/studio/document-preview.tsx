import { JsonForms } from '@jsonforms/react';
import { useMemo, useState } from 'react';
import * as defaults from '../renderers/default/index';
import { DocumentRunner } from '../runner/index';
import { DEFAULT_VARIANT, variantOf, type DocumentContent } from './document-types';
import { previewUischema } from './preview-uischema';

export interface DocumentPreviewProps {
  content: DocumentContent;
  /** The focused Form, previewed alone (doc 247 rule 6). */
  focusedId: string | null;
  /** The variant previewed (doc 262 rule 3); default unless named. */
  variant?: string;
}

/**
 * Preview mode's content area (doc 247 rules 6-11, doc 274 rules 33, 38). The ROOT — a Form or a Funnel — runs in
 * `DocumentRunner`, filling the whole area with its action bar (and, for a Funnel, the step rail). A FOCUSED Form is
 * a quick look at one page: plain `<JsonForms>` in a scrolling column, no action bar. A Form spans the full width and
 * insets its own content. The data is this component's own state, so each switch to Preview starts empty, and nothing
 * typed here reaches the document.
 */
export function DocumentPreview({
  content,
  focusedId,
  variant: name = DEFAULT_VARIANT,
}: DocumentPreviewProps) {
  const variant = variantOf(content, name);
  const uischema = useMemo(() => previewUischema(variant, focusedId), [variant, focusedId]);
  const [data, setData] = useState<unknown>({});
  if (uischema === variant)
    return (
      <div data-slot="document-preview" className="flex min-h-0 flex-1 flex-col">
        <DocumentRunner schema={content.schema} uischema={variant} data={data} onChange={setData} />
      </div>
    );
  return (
    <div data-slot="document-preview" className="min-h-0 flex-1 overflow-y-auto">
      <div className="w-full">
        {uischema === null ? (
          <p
            data-slot="document-preview-empty"
            className="px-6 py-12 text-center text-sm text-muted-foreground"
          >
            Nothing to preview yet.
          </p>
        ) : (
          <JsonForms
            schema={content.schema}
            uischema={uischema as never}
            data={data}
            renderers={defaults.renderers}
            cells={defaults.cells}
            onChange={({ data: next }) => setData(next)}
          />
        )}
      </div>
    </div>
  );
}
