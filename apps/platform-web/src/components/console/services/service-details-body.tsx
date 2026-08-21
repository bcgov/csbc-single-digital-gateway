import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { EditActionProvider } from '@repo/react/jsonforms-renderers';
import { displayRenderers } from '@repo/react/jsonforms-renderers-display';
import { stampEditIds } from '@repo/react/uischema-edit';
import { Button } from '@repo/ui/button';
import { Link } from '@tanstack/react-router';
import { Pencil } from 'lucide-react';
import { useMemo } from 'react';
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
 * The Service details body (features 174, 175) — the service version's `data` rendered read-only
 * from its own `schema`/`uischema`, with one anchored `<section>` per top-level uischema `Group`.
 *
 * `GroupLayoutRenderer` already emits the `<h2 class="section-heading">` (and an optional
 * `options.description`) for a Group, so the Group element is dispatched **as-is** and this
 * component adds no heading of its own — doing so would render every section title twice.
 *
 * The console's always-on sections (`SERVICE_ALWAYS_SECTIONS`, e.g. Configuration) are appended
 * after the derived ones. They collect no service data, so they render their own heading and a
 * placeholder body — but they DO carry an anchor, so the matching sidebar link resolves.
 *
 * **Windowed editing (feature 175).** Any element the definition marked `options.edit` gets an Edit
 * affordance beside its heading, at any depth. `stampEditIds` resolves each section's id against the
 * whole uischema first, because a layout renderer only ever sees its own element. The
 * `EditActionProvider` is mounted HERE, around the read-only surface — never at the app root: the
 * editable renderer set shares these same layout components, so a root-mounted provider would render
 * Edit buttons inside the edit window itself.
 *
 * `renderAction` returns `null` unless the viewed version is a `draft`, which is the single place
 * the draft policy is enforced client-side (`updateDraft` 409s on anything else server-side).
 */
export function ServiceDetailsBody({
  slug,
  serviceId,
  versionId,
  isDraft,
  schema,
  uischema,
  data,
}: {
  slug: string;
  serviceId: string;
  versionId: string;
  isDraft: boolean;
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
  data: Record<string, unknown>;
}) {
  // Stamp once, then derive from the stamped tree so the sections and the renderers agree on ids.
  const stamped = useMemo(() => stampEditIds(uischema), [uischema]);
  const runs = deriveRuns(stamped);

  const editActions = useMemo(
    () => ({
      renderAction: (section: { id: string; label: string; actionLabel: string | null }) =>
        isDraft ? (
          <Button
            size="sm"
            variant="outline"
            render={
              <Link
                to="/app/$slug/services/$id/versions/$versionId/details/edit/$sectionId"
                params={{ slug, id: serviceId, versionId, sectionId: section.id }}
              />
            }
          >
            <Pencil className="size-4" aria-hidden />
            {/* The definition may author its own wording (`options.edit.actionLabel`) for a window
                that isn't really an "edit" — e.g. "Manage methods". */}
            {section.actionLabel ?? 'Edit'}
            <span className="sr-only"> {section.label}</span>
          </Button>
        ) : null,
    }),
    [isDraft, slug, serviceId, versionId],
  );

  return (
    <EditActionProvider value={editActions}>
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
        {alwaysSectionAnchors(stamped, SERVICE_ALWAYS_SECTIONS).map((section) => (
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
    </EditActionProvider>
  );
}
