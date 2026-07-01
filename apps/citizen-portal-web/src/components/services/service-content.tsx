import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { displayRenderers } from '@repo/react/jsonforms-renderers-display';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

/** A simple breadcrumb trail. Client-side router links so a crumb click doesn't reload the app. */
export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {trail.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3" aria-hidden /> : null}
            {crumb.href ? (
              <Link to={crumb.href} className="hover:text-foreground hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

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
