import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  UISchemaElement,
} from '@jsonforms/core';
import { JsonFormsDispatch } from '@jsonforms/react';
import { Heading } from '@repo/ui/heading';
import { useMemo } from 'react';
import type { FunnelElement } from './funnel-graph';
import { SUMMARY_LABEL } from './funnel-sidebar';

interface FunnelSummaryProps {
  /** Rule 30: the PROJECTED path's Forms, in order — never the visited set. */
  readonly forms: readonly FunnelElement[];
  readonly schema: JsonSchema;
  readonly path: string;
  readonly renderers?: JsonFormsRendererRegistryEntry[];
  readonly cells?: JsonFormsCellRendererRegistryEntry[];
}

/**
 * The summary page (doc 274 rule 30): a "Summary" heading, then the path's Forms stacked in a VerticalLayout — doc
 * 247's stacked preview, restricted to the path — dispatched DISABLED, so nothing can be edited here.
 */
export function FunnelSummary({ forms, schema, path, renderers, cells }: FunnelSummaryProps) {
  const uischema = useMemo(
    () => ({ type: 'VerticalLayout', elements: [...forms] }) as unknown as UISchemaElement,
    [forms],
  );
  return (
    // Each Form's title sits one step below the page's own "Summary" heading. A DESCENDANT rule, since the Form renderer
    // takes no props: its specificity beats the title's own `text-h1`.
    <section
      data-slot="funnel-summary"
      className="flex flex-col [&_[data-slot=form-title]]:text-h2"
    >
      {/* Inset like the Forms below it, which inset themselves (rule 40). */}
      <Heading level={1} size={1} className="px-6 pt-8 font-semibold">
        {SUMMARY_LABEL}
      </Heading>
      <JsonFormsDispatch
        uischema={uischema}
        schema={schema}
        path={path}
        enabled={false}
        {...(renderers !== undefined && { renderers })}
        {...(cells !== undefined && { cells })}
      />
    </section>
  );
}
