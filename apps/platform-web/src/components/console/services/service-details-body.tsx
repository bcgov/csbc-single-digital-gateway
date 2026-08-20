import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { displayRenderers } from '@repo/react/jsonforms-renderers-display';
import { SERVICE_ALWAYS_SECTIONS } from '@/lib/service-nav';
import { alwaysSectionAnchors, deriveRuns, type UiElement } from '@/lib/service-sections';

/** Top-level controls surfaced as page chrome, so the body must not render them a second time. */
const OMITTED_SCOPES = new Set(['title', 'description']);

/** Drop the controls whose schema property is in `OMITTED_SCOPES` (mirrors the citizen portal). */
function withoutOmitted(elements: UiElement[]): UiElement[] {
  return elements.filter((element) => {
    const { scope } = element as { scope?: unknown };
    if (typeof scope !== 'string') {
      return true;
    }
    return !OMITTED_SCOPES.has(scope.split('/').pop() ?? '');
  });
}

/**
 * Render one run of top-level uischema elements read-only. Each run gets its own `<JsonForms>` with
 * the full schema and data but a synthetic `VerticalLayout` holding only that run's elements — which
 * is what lets the page wrap each `Group` in its own anchored `<section>` without touching
 * `@repo/react`. Read-only, so the per-run instances share no form state.
 */
function Run({
  schema,
  elements,
  data,
}: {
  schema: Record<string, unknown>;
  elements: UiElement[];
  data: Record<string, unknown>;
}) {
  return (
    <JsonForms
      schema={schema as JsonSchema}
      uischema={{ type: 'VerticalLayout', elements } as unknown as UISchemaElement}
      data={data}
      renderers={displayRenderers}
    />
  );
}

/**
 * The Service details body (feature 174) — the service version's `data` rendered read-only from its
 * own `schema`/`uischema`, with one anchored `<section>` per top-level uischema `Group`.
 *
 * `GroupLayoutRenderer` already emits the `<h2 class="section-heading">` (and an optional
 * `options.description`) for a Group, so the Group element is dispatched **as-is** and this
 * component adds no heading of its own — doing so would render every section title twice.
 *
 * The console's always-on sections (`SERVICE_ALWAYS_SECTIONS`, e.g. Configuration) are appended
 * after the derived ones. They collect no service data, so they render their own heading and a
 * placeholder body — but they DO carry an anchor, so the matching sidebar link resolves.
 */
export function ServiceDetailsBody({
  schema,
  uischema,
  data,
}: {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
  data: Record<string, unknown>;
}) {
  const runs = deriveRuns(uischema);

  return (
    <div className="flex flex-col gap-10">
      {runs.map((run, index) => {
        if (run.kind === 'section') {
          return (
            <section
              key={run.anchor}
              id={run.anchor}
              className="flex scroll-mt-6 flex-col gap-3"
              aria-label={run.label === '' ? undefined : run.label}
            >
              <Run schema={schema} elements={[run.element]} data={data} />
            </section>
          );
        }
        const elements = withoutOmitted(run.elements);
        if (elements.length === 0) {
          return null;
        }
        return (
          <div key={`loose-${index}`} className="flex flex-col gap-3">
            <Run schema={schema} elements={elements} data={data} />
          </div>
        );
      })}

      {/* Console-owned sections — always present, never derived from the definition. Anchors are
          reconciled against the derived ones so a link can never resolve to two elements. */}
      {alwaysSectionAnchors(uischema, SERVICE_ALWAYS_SECTIONS).map((section) => (
        <section
          key={section.anchor}
          id={section.anchor}
          className="flex scroll-mt-6 flex-col gap-3"
          aria-label={section.label}
        >
          <h2 className="section-heading">{section.label}</h2>
          <p className="text-sm text-muted-foreground">This section is coming soon.</p>
        </section>
      ))}
    </div>
  );
}
