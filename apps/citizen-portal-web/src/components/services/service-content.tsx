import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { displayRenderers } from '@repo/react/jsonforms-renderers-display';

// Re-exported for existing importers; the component lives in its own (JsonForms-free) module.
export { Breadcrumb } from '@/components/breadcrumb';

/** The element shape we filter on — a JSONForms `Control` carries a `scope`. */
interface ScopedElement {
  scope?: string;
  elements?: unknown;
}

/**
 * Drop the top-level controls whose property is in `omit` (those are promoted to page chrome —
 * e.g. the service title/description shown in the header), so they aren't rendered twice.
 */
function omitControls(uischema: Record<string, unknown>, omit: string[]): Record<string, unknown> {
  if (omit.length === 0 || !Array.isArray((uischema as { elements?: unknown }).elements)) {
    return uischema;
  }
  const elements = (uischema as { elements: ScopedElement[] }).elements.filter((element) => {
    const scope = element?.scope;
    if (typeof scope !== 'string') {
      return true;
    }
    return !omit.includes(scope.split('/').pop() ?? '');
  });
  return { ...uischema, elements };
}

/**
 * Render a service version's `data` as read-only content via the `@repo/react` display renderers,
 * driven by the service's schema + uischema (feature 61). `omit` removes fields surfaced elsewhere.
 */
export function ServiceContent({
  schema,
  uischema,
  data,
  omit = [],
}: {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
  data: Record<string, unknown>;
  omit?: string[];
}) {
  return (
    <JsonForms
      schema={schema as JsonSchema}
      uischema={omitControls(uischema, omit) as unknown as UISchemaElement}
      data={data}
      renderers={displayRenderers}
    />
  );
}
