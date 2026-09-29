import { FormRunner } from '@repo/forms/runner';
import { Badge } from '@repo/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { VersionDropdown } from '@/components/common/version-dropdown';
import { ServiceConsolePage } from '@/components/console/services/service-console-page';
import { selectServiceVersion, serviceQueryOptions } from '@/lib/services';
import { studioDocumentOf } from '@/lib/studio-content';

/**
 * A read-only runner takes `data`/`onChange` all the same (doc 218 rule 9). Module consts: a fresh `{}` each render
 * would churn JSONForms for a runner that can never produce a change.
 */
const NO_ANSWERS: Record<string, unknown> = Object.freeze({});
const noop = () => {};

/**
 * Doc 229 — the service console's Details section: a version's content, READ-ONLY.
 *
 * Nothing is authored or answered here, so the document is drawn by the disabled `FormRunner` (doc 218 — the same
 * view the admin template page gives a published template) with `actions={false}`: no action bar, because every
 * button on it could only ever be disabled.
 *
 * Which version: the permalink's, otherwise `selectServiceVersion`'s current one — latest published, else latest —
 * the same rule the API uses, so this page and the rest of the console agree about what "current" is.
 */
export function ServiceDetailsView({
  slug,
  id,
  versionId,
}: {
  readonly slug: string;
  readonly id: string;
  /** The permalink's version; absent on the plain Details route. */
  readonly versionId?: string | undefined;
}) {
  const navigate = useNavigate();
  const { data } = useQuery(serviceQueryOptions(id));
  if (!data) {
    // An element, never `null`: `ServiceConsolePage` reads absent children as its "coming soon" note, which is
    // exactly what this section no longer is — it flashed while the service loaded.
    return (
      <ServiceConsolePage title="Service details">
        <div data-slot="service-details-loading" aria-busy="true" />
      </ServiceConsolePage>
    );
  }

  const { versions } = data;
  const selected = selectServiceVersion(versions, versionId);

  if (versions.length === 0) {
    return (
      <ServiceConsolePage title="Service details">
        <p className="text-sm text-muted-foreground">This service has no versions yet.</p>
      </ServiceConsolePage>
    );
  }
  if (selected === undefined) {
    return (
      <ServiceConsolePage title="Service details">
        <p className="text-sm text-muted-foreground">
          Version not found.{' '}
          <Link
            to="/app/$slug/services/$id/details"
            params={{ slug, id }}
            className="text-foreground underline"
          >
            Show the current version
          </Link>
        </p>
      </ServiceConsolePage>
    );
  }

  const document = studioDocumentOf(selected.content);
  const header = [
    <Badge key="status" color="grey">
      {selected.status}
    </Badge>,
    <VersionDropdown
      key="versions"
      versions={versions}
      selectedId={selected.id}
      onSelect={(next) =>
        void navigate({
          to: '/app/$slug/services/$id/versions/$versionId/details',
          params: { slug, id, versionId: next },
        })
      }
    />,
  ];

  return (
    <ServiceConsolePage title="Service details" extra={header}>
      {document === null ? (
        // The same words `VersionContent` uses (doc 218 rule 13): a row that predates the studio can hold anything.
        <p role="alert" className="text-sm text-muted-foreground">
          This version’s content isn’t a form document, so it can’t be opened here.
        </p>
      ) : (
        <div
          data-slot="service-details-content"
          className="rounded-xl border border-border bg-card"
        >
          <FormRunner
            // Rule 6: a new version starts the runner fresh — its position belongs to the document it was showing.
            key={selected.id}
            disabled
            actions={false}
            schema={document.schema}
            uischema={document.uischema}
            data={NO_ANSWERS}
            onChange={noop}
          />
        </div>
      )}
    </ServiceConsolePage>
  );
}
