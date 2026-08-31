import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect } from 'react';
import {
  definitionForServiceVersion,
  selectServiceVersion,
  serviceQueryOptions,
} from '@/lib/services';
import { ServiceConsolePage } from './service-console-page';
import { ServiceDetailsBody } from './service-details-body';
import { VersionPicker } from './version-picker';

/** Scroll the section matching the current `#hash` into view. `<main>` is the scroll container, so
 * `scrollIntoView` (which finds the nearest scrollable ancestor) does the right thing. */
function useHashScroll(hash: string, ready: boolean) {
  useEffect(() => {
    // Sections only exist once the definition has rendered — scrolling before that finds nothing.
    if (!hash || !ready) {
      return;
    }
    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, ready]);
}

/**
 * The Service details page (features 164, 174) — one scrollable page of sections rendered read-only
 * from the service's `schema`/`uischema` and the selected version's `data`. Sections are **derived
 * from the top-level uischema `Group` elements** (`deriveRuns`), not from a hardcoded list, and the
 * sidebar submenu derives its anchors from the same helper so the two can never drift.
 *
 * Serves two routes: `…/details` (the published version) and `…/versions/$versionId/detailss` (the
 * version named in the path). The header's version picker navigates between them.
 */
export function ServiceDetailsPage({ versionId: versionIdProp }: { versionId?: string } = {}) {
  // `strict: false` so one component serves both routes: the params carry `versionId` only on the
  // version permalink. The prop is an override for tests and for any future embedding.
  const params = useParams({ strict: false }) as {
    slug: string;
    id: string;
    versionId?: string;
  };
  const { slug, id } = params;
  const versionId = versionIdProp ?? params.versionId;
  const hash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  const { data: detail, isPending, isError } = useQuery(serviceQueryOptions(id));

  const versions = detail?.versions ?? [];
  const selected = selectServiceVersion(versions, versionId);
  const definition = definitionForServiceVersion(detail, versionId);

  useHashScroll(hash, definition !== undefined);

  const published = versions.find((version) => version.status === 'published');

  const onSelectVersion = (nextId: string) => {
    // The published version is the canonical `…/details` URL; everything else is a permalink.
    if (published !== undefined && nextId === published.id) {
      void navigate({ to: '/app/$slug/services/$id/details', params: { slug, id } });
      return;
    }
    void navigate({
      to: '/app/$slug/services/$id/versions/$versionId/details',
      params: { slug, id, versionId: nextId },
    });
  };

  const picker =
    selected === undefined
      ? []
      : [
          <VersionPicker
            key="version-picker"
            versions={versions}
            selectedId={selected.id}
            onSelect={onSelectVersion}
          />,
        ];

  return (
    <ServiceConsolePage title="Service details" extra={picker}>
      {isPending ? (
        <div className="flex flex-col gap-4" aria-hidden>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      ) : isError || detail === undefined ? (
        <p className="text-sm text-muted-foreground">
          This service couldn’t be loaded. Try refreshing the page.
        </p>
      ) : selected === undefined || definition === undefined ? (
        <p className="text-sm text-muted-foreground">
          {versionId === undefined
            ? 'This service has no versions yet.'
            : 'That version of this service doesn’t exist.'}
        </p>
      ) : (
        <ServiceDetailsBody
          slug={slug}
          serviceId={id}
          versionId={selected.id}
          isDraft={selected.status === 'draft'}
          schema={definition.schema}
          uischema={definition.uischema}
          data={selected.data}
        />
      )}
    </ServiceConsolePage>
  );
}
