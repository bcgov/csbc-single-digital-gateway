import { variantOf } from '@repo/documents/content';
import { DocumentRunner } from '@repo/documents/runner';
import { Badge } from '@repo/ui/badge';
import { buttonVariants } from '@repo/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Pencil } from 'lucide-react';
import { VersionDropdown } from '@/components/common/version-dropdown';
import { ServiceConsolePage } from '@/components/console/services/service-console-page';
import { answersOf } from '@/lib/service-answers';
import { selectServiceVersion, serviceQueryOptions } from '@/lib/services';
import { documentContentOf } from '@/lib/studio-content';

/** A read-only runner takes `onChange` all the same (doc 218 rule 9); it can never call it. */
const noop = () => {};

/**
 * Doc 229 — the service console's Details section: a version's content, READ-ONLY.
 *
 * Nothing is authored or answered here, so the document's default variant is drawn by a disabled `DocumentRunner`
 * (doc 276) with `actions={false}`: no action bar, because every
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

  const document = documentContentOf(selected.content);
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
    // Doc 230 rule 9: right of the picker — opens the version on screen for editing. A real link (it
    // navigates), drawn as a small outline button.
    <Link
      key="edit"
      to="/app/$slug/services/$id/versions/$versionId/edit"
      params={{ slug, id, versionId: selected.id }}
      className={buttonVariants({ size: 'sm', variant: 'outline' })}
    >
      <Pencil className="size-4" aria-hidden />
      Edit
    </Link>,
  ];

  return (
    <ServiceConsolePage title="Service details" extra={header}>
      {document === null ? (
        // The same words `VersionContent` uses (doc 218 rule 13): a row that predates the studio can hold anything.
        <p role="alert" className="text-sm text-muted-foreground">
          This version’s content isn’t a document the studio can open.
        </p>
      ) : (
        <div
          data-slot="service-details-content"
          className="rounded-xl border border-border bg-card"
        >
          <DocumentRunner
            // Rule 6: a new version starts the runner fresh — its position belongs to the document it was showing.
            key={selected.id}
            disabled
            actions={false}
            schema={document.schema}
            // Doc 276: staff see the DEFAULT variant.
            uischema={variantOf(document)}
            // Doc 230 rule 9: the staff's answers, shown read-only.
            data={answersOf(selected.content)}
            onChange={noop}
          />
        </div>
      )}
    </ServiceConsolePage>
  );
}
