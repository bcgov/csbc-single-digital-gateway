import { JsonForms } from '@jsonforms/react';
import { useMemo, useState } from 'react';
import * as defaults from '../renderers/default/index';
import type { DocumentContent } from './document-types';
import { previewUischema } from './preview-uischema';

export interface DocumentPreviewProps {
  content: DocumentContent;
  /** The focused Form, previewed alone (doc 247 rule 6). */
  focusedId: string | null;
}

/**
 * Preview mode's content area (doc 247 rules 6-11): the document filled in through the default renderers, on a
 * scrolling, centred 768px page. Its data is this component's own state, so each mount — each switch to Preview —
 * starts empty, and nothing typed here reaches the document.
 */
export function DocumentPreview({ content, focusedId }: DocumentPreviewProps) {
  const variant = content.variants.default;
  const uischema = useMemo(() => previewUischema(variant, focusedId), [variant, focusedId]);
  const [data, setData] = useState<unknown>({});
  return (
    <div data-slot="document-preview" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        {uischema === null ? (
          <p
            data-slot="document-preview-empty"
            className="py-12 text-center text-sm text-muted-foreground"
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
