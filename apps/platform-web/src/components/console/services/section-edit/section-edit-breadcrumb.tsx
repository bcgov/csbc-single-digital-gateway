import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/breadcrumb';
import { Link } from '@tanstack/react-router';

/**
 * Breadcrumb for the section edit page: Services / &lt;service&gt; / Service details / &lt;section&gt;.
 *
 * The page is a sibling of the `_console` shell, so it has no service sidebar to orient the user —
 * this trail is the only way back up. It renders through `useSetPageChrome` into the app-level
 * `ConsoleBreadcrumbBar`, the same route the sidebar-free application builders use.
 *
 * "Service details" points at whichever details URL the editor was opened from: the version
 * permalink when one is in the path, else the canonical route.
 */
export function SectionEditBreadcrumb({
  slug,
  serviceId,
  versionId,
  serviceTitle,
  label,
}: {
  slug: string;
  serviceId: string;
  /** Omitted on the canonical (non-permalink) route. */
  versionId?: string | undefined;
  serviceTitle: string;
  label: string;
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/app/$slug/services" params={{ slug }} />}>
            Services
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink
            render={<Link to="/app/$slug/services/$id" params={{ slug, id: serviceId }} />}
          >
            {serviceTitle}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink
            render={
              versionId === undefined ? (
                <Link to="/app/$slug/services/$id/details" params={{ slug, id: serviceId }} />
              ) : (
                <Link
                  to="/app/$slug/services/$id/versions/$versionId/details"
                  params={{ slug, id: serviceId, versionId }}
                />
              )
            }
          >
            Service details
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
