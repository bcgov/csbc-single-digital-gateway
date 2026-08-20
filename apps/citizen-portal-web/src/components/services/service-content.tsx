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
 * Drop the controls whose property is in `omit` (those are promoted to page chrome — e.g. the
 * service title/description in the header, the contact methods in their own section), so they
 * aren't rendered twice.
 *
 * This recurses into nested layouts on purpose: since feature 174 the Service type nests its fields
 * inside top-level `Group`s, so an omitted control is no longer necessarily a top-level element. A
 * top-level-only filter silently stopped omitting `contact_methods` and rendered it twice.
 */
function omitControls(uischema: Record<string, unknown>, omit: string[]): Record<string, unknown> {
  if (omit.length === 0 || !Array.isArray((uischema as { elements?: unknown }).elements)) {
    return uischema;
  }
  const elements = (uischema as { elements: ScopedElement[] }).elements
    .filter((element) => {
      const scope = element?.scope;
      if (typeof scope !== 'string') {
        return true;
      }
      return !omit.includes(scope.split('/').pop() ?? '');
    })
    .map((element) =>
      Array.isArray(element?.elements)
        ? (omitControls(element as unknown as Record<string, unknown>, omit) as ScopedElement)
        : element,
    );
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
